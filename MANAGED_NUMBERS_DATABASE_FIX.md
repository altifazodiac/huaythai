# การแก้ไขปัญหาเลขอั้นหายไปเมื่อปิดและเข้าใหม่

## ปัญหาที่พบ
- ผู้ใช้สามารถเพิ่มเลขอั้นได้และมีการแจ้งเตือนว่าเพิ่มสำเร็จ
- แต่เมื่อปิดและเข้าใหม่ เลขอั้นที่เพิ่มไว้จะหายไป
- ไม่มีการบันทึกถาวรลงฐานข้อมูล
- ข้อผิดพลาด: `relation "public.managed_numbers" does not exist`

## สาเหตุ
1. **ระบบใช้ localStorage แทนฐานข้อมูล** ในไฟล์ `lib/contexts/NumberCapContext.tsx`
2. **ไม่มีตาราง managed_numbers ในฐานข้อมูล** Supabase

## การแก้ไข

### 1. สร้างตาราง managed_numbers ในฐานข้อมูล
```sql
-- Create managed_numbers table for storing number cap management data
CREATE TABLE IF NOT EXISTS managed_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lottery_sub_type_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    digit_count INTEGER NOT NULL,
    type_number TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('half', 'close')),
    reason TEXT,
    is_manual BOOLEAN DEFAULT false,
    draw_date DATE NOT NULL,
    risk_percentage NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Create unique constraint to prevent duplicates
    UNIQUE(lottery_sub_type_id, number, digit_count, type_number, draw_date)
);

-- Create indexes for better performance
CREATE INDEX idx_managed_numbers_lottery_sub_type_draw_date 
ON managed_numbers(lottery_sub_type_id, draw_date);

CREATE INDEX idx_managed_numbers_number_digit_type 
ON managed_numbers(number, digit_count, type_number);

-- Enable RLS
ALTER TABLE managed_numbers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON managed_numbers
    FOR ALL USING (auth.role() = 'authenticated');
```

### 2. แก้ไขฟังก์ชัน `fetchManagedNumbers`
เปลี่ยนจาก localStorage เป็น Supabase:

```typescript
const fetchManagedNumbers = useCallback(async (subTypeId: number, drawDate: string) => {
  try {
    const { data, error } = await supabase
      .from('managed_numbers')
      .select('*')
      .eq('lottery_sub_type_id', subTypeId)
      .eq('draw_date', drawDate);

    if (error) {
      console.error('Error fetching managed numbers:', error);
      return;
    }

    if (data) {
      setManagedNumbers(data);
    }
  } catch (error) {
    console.error('Error fetching managed numbers:', error);
  }
}, []);
```

### 3. แก้ไขฟังก์ชัน `updateManagedNumbersForSubType`
เพิ่มการบันทึกลงฐานข้อมูล:

```typescript
const updateManagedNumbersForSubType = useCallback(async (subTypeId: number, drawDate: string, numbers: ManagedNumber[]) => {
  try {
    // ลบเลขเก่าของ subType และ drawDate นี้
    const { error: deleteError } = await supabase
      .from('managed_numbers')
      .delete()
      .eq('lottery_sub_type_id', subTypeId)
      .eq('draw_date', drawDate);

    if (deleteError) {
      console.error('Error deleting old managed numbers:', deleteError);
      return;
    }

    // เพิ่มเลขใหม่ทั้งหมด
    if (numbers.length > 0) {
      const { error: insertError } = await supabase
        .from('managed_numbers')
        .insert(numbers);

      if (insertError) {
        console.error('Error inserting managed numbers:', insertError);
        return;
      }
    }

    // อัพเดท state
    setManagedNumbers(numbers);
  } catch (error) {
    console.error('Error updating managed numbers:', error);
  }
}, []);
```

### 4. แก้ไขฟังก์ชัน `addManagedNumber`
เพิ่มการบันทึกลงฐานข้อมูล:

```typescript
const addManagedNumber = async (number: ManagedNumber) => {
  try {
    // บันทึกลงฐานข้อมูล
    const { error } = await supabase
      .from('managed_numbers')
      .upsert({
        lottery_sub_type_id: number.lottery_sub_type_id,
        number: number.number,
        digit_count: number.digit_count,
        type_number: number.type_number,
        action: number.action,
        reason: number.reason,
        is_manual: number.is_manual,
        draw_date: number.draw_date,
        risk_percentage: number.risk_percentage
      }, {
        onConflict: 'lottery_sub_type_id, number, digit_count, type_number, draw_date'
      });

    if (error) {
      console.error('Error saving managed number:', error);
      return;
    }

    // อัพเดท state
    setManagedNumbers(prev => {
      const exists = prev.some(n => 
        n.number === number.number && 
        n.digit_count === number.digit_count && 
        n.type_number === number.type_number &&
        n.lottery_sub_type_id === number.lottery_sub_type_id
      );
      return exists ? prev : [...prev, number];
    });
  } catch (error) {
    console.error('Error adding managed number:', error);
  }
};
```

### 5. แก้ไขฟังก์ชัน `removeManagedNumber`
เพิ่มการลบจากฐานข้อมูล:

```typescript
const removeManagedNumber = async (numberKey: string) => {
  try {
    // แยกข้อมูลจาก numberKey
    const parts = numberKey.split('-');
    if (parts.length >= 4) {
      const number = parts[0];
      const digit_count = parseInt(parts[1]);
      const type_number = parts[2];
      const lottery_sub_type_id = parseInt(parts[3]);

      // ลบจากฐานข้อมูล
      const { error } = await supabase
        .from('managed_numbers')
        .delete()
        .eq('number', number)
        .eq('digit_count', digit_count)
        .eq('type_number', type_number)
        .eq('lottery_sub_type_id', lottery_sub_type_id);

      if (error) {
        console.error('Error deleting managed number:', error);
        return;
      }
    }

    // อัพเดท state
    setManagedNumbers(prev => prev.filter(n => 
      `${n.number}-${n.digit_count}-${n.type_number}` !== numberKey
    ));
  } catch (error) {
    console.error('Error removing managed number:', error);
  }
};
```

### 6. อัปเดต Interface
เปลี่ยนฟังก์ชันเป็น async:

```typescript
interface NumberCapContextType {
  managedNumbers: ManagedNumber[];
  setManagedNumbers: (numbers: ManagedNumber[]) => void;
  addManagedNumber: (number: ManagedNumber) => Promise<void>;
  removeManagedNumber: (numberKey: string) => Promise<void>;
  checkNumberStatus: (number: string, digitCount: number, typeNumber: string, subTypeId: number) => ManagedNumber | null;
  fetchManagedNumbers: (subTypeId: number, drawDate: string) => Promise<void>;
  updateManagedNumbersForSubType: (subTypeId: number, drawDate: string, numbers: ManagedNumber[]) => Promise<void>;
  numberAnalysis: Record<string, NumberSalesData>;
  setNumberAnalysis: (analysis: Record<string, NumberSalesData>) => void;
}
```

### 7. แก้ไข useEffect ในไฟล์ analyzer components
```typescript
// Sync managed numbers with Context when they change
useEffect(() => {
  const syncManagedNumbers = async () => {
    if (managedNumbers.length > 0) {
      const numbersWithContext = managedNumbers.map(n => ({
        ...n,
        lottery_sub_type_id,
        draw_date: selectedDate
      }));
      await updateManagedNumbersForSubType(lottery_sub_type_id, selectedDate, numbersWithContext);
    }
  };
  
  syncManagedNumbers();
}, [managedNumbers, lottery_sub_type_id, selectedDate, updateManagedNumbersForSubType]);
```

## ผลลัพธ์
- ✅ **ตาราง managed_numbers ถูกสร้างในฐานข้อมูล Supabase**
- ✅ **เลขอั้นจะถูกบันทึกลงฐานข้อมูลอย่างถาวร**
- ✅ **เมื่อปิดและเข้าใหม่ เลขอั้นจะยังคงอยู่**
- ✅ **ระบบจะดึงข้อมูลจากฐานข้อมูลเมื่อโหลดหน้าใหม่**
- ✅ **ข้อผิดพลาด "relation does not exist" ถูกแก้ไข**

## การทดสอบ
1. เพิ่มเลขอั้นใหม่
2. ปิดเบราว์เซอร์
3. เข้าใหม่
4. ตรวจสอบว่าเลขอั้นยังคงอยู่

## หมายเหตุ
- ระบบใช้ unique constraint เพื่อป้องกันข้อมูลซ้ำ
- มี indexes เพื่อเพิ่มประสิทธิภาพการค้นหา
- ใช้ RLS (Row Level Security) เพื่อความปลอดภัย
- ระบบ upsert ป้องกันข้อผิดพลาดจากการเพิ่มข้อมูลซ้ำ 