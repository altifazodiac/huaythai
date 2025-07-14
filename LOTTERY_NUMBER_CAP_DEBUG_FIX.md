# การแก้ไขปัญหาระบบตรวจสอบเลขอั้น

## ปัญหาที่พบ

### 1. Infinite Loop ใน useEffect
- **ปัญหา**: การใส่ `fetchManagedNumbers` ใน dependency array ของ useEffect ทำให้เกิด infinite loop
- **สาเหตุ**: `fetchManagedNumbers` เป็น function ที่ถูกสร้างใหม่ทุกครั้งที่ component re-render
- **แก้ไข**: ลบ `fetchManagedNumbers` ออกจาก dependency array

```typescript
// ก่อนแก้ไข (ผิด)
useEffect(() => {
  // ...
}, [initialState.subType, selectedDraw, fetchManagedNumbers]);

// หลังแก้ไข (ถูกต้อง)
useEffect(() => {
  // ...
}, [initialState.subType, selectedDraw]);
```

### 2. managedNumbers ว่างเปล่า
- **ปัญหา**: Context ไม่ได้โหลดข้อมูลหรือข้อมูลไม่ sync
- **แก้ไข**: เพิ่ม error handling และ logging ที่ดีขึ้น, ใช้ fallback เป็น empty array

### 3. Debug Logs ซ้ำซ้อน
- **ปัญหา**: มีการ log หลายร้อยครั้งทำให้ console spam
- **แก้ไข**: ลด debug logs โดยแสดงเฉพาะเมื่อพบข้อมูลหรือมีปัญหา

## การแก้ไขที่ทำ

### 1. ปรับปรุง NumberCapContext (lib/contexts/NumberCapContext.tsx)

#### a) ปรับปรุง getUniversalNumberCapAction
```typescript
const getUniversalNumberCapAction = (
  number: string,
  digitCount: number,
  typeNumber: string,
  subTypeId: number,
  drawDate: string
): ManagedNumber | null => {
  const found = context.managedNumbers.find(
    (n) =>
      n.number === number &&
      n.digit_count === digitCount &&
      n.type_number === typeNumber &&
      n.lottery_sub_type_id === subTypeId &&
      n.draw_date === drawDate
  );

  // แสดง debug เฉพาะเมื่อพบข้อมูลหรือมีปัญหา
  if (found || context.managedNumbers.length === 0) {
    console.log('DEBUG: [NumberCapContext]', { 
      number, digitCount, typeNumber, subTypeId, drawDate, 
      managedCount: context.managedNumbers.length, 
      found: found ? found.action : 'not found' 
    });
  }

  return found || null;
};
```

#### b) ปรับปรุง fetchManagedNumbers
```typescript
const fetchManagedNumbers = useCallback(async (subTypeId: number, drawDate: string) => {
  try {
    console.log('DEBUG: [NumberCapContext] fetchManagedNumbers:', { subTypeId, drawDate });
    
    const { data, error } = await supabase
      .from('managed_numbers')
      .select('*')
      .eq('lottery_sub_type_id', subTypeId)
      .eq('draw_date', drawDate);

    if (error) {
      console.error('Error fetching managed numbers:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลเลขอั้นได้: ${error.message}`);
    }

    const managedNumbersData = data || [];
    console.log('DEBUG: [NumberCapContext] fetched managed numbers:', managedNumbersData.length, 'items');
    
    if (managedNumbersData.length > 0) {
      console.log('DEBUG: [NumberCapContext] sample data:', managedNumbersData[0]);
    }
    
    setManagedNumbers(managedNumbersData);
  } catch (error) {
    console.error('Error fetching managed numbers:', error);
    // Set empty array on error to prevent undefined state
    setManagedNumbers([]);
    throw error;
  }
}, []);
```

### 2. ปรับปรุง Lottery Orders Page (app/(protected)/lottery-orders/page.tsx)

#### a) แก้ไข useEffect infinite loop
```typescript
// โหลดข้อมูลเลขอั้นเมื่อเปลี่ยน subtype หรือ draw date
useEffect(() => {
  if (initialState.subType && selectedDraw) {
    const drawDateStr = selectedDraw.date.toISOString().split('T')[0];
    console.log('🔄 Loading managed numbers for:', { subType: initialState.subType, drawDate: drawDateStr });
    
    fetchDirectManagedNumbers(initialState.subType, drawDateStr);
    fetchManagedNumbers(initialState.subType, drawDateStr);
  }
}, [initialState.subType, selectedDraw]); // ลบ fetchManagedNumbers ออก
```

#### b) เพิ่มฟังก์ชันตรวจสอบเลขอั้นแบบรวม
```typescript
// ฟังก์ชันตรวจสอบเลขอั้นแบบรวม (ลองทั้ง cache และ context)
const getNumberCapAction = (number: string, digitCount: number, typeNumber: string, subTypeId: number, drawDate: string) => {
  // ลองตรวจสอบจาก cache ก่อน (เร็วกว่า)
  let result = getDirectNumberCapAction(number, digitCount, typeNumber, subTypeId, drawDate);
  
  // ถ้าไม่พบใน cache ให้ลองจาก context
  if (!result) {
    const contextResult = getUniversalNumberCapAction(number, digitCount, typeNumber, subTypeId, drawDate);
    if (contextResult) {
      result = {
        action: contextResult.action,
        reason: contextResult.reason
      };
    }
  }
  
  return result;
};
```

#### c) เพิ่มฟังก์ชันทดสอบระบบ
```typescript
// ทดสอบระบบเลขอั้น
const testNumberCapSystem = () => {
  if (!initialState.subType || !selectedDrawDate) {
    console.log('❌ Cannot test: missing subType or selectedDrawDate');
    return;
  }
  
  const drawDate = selectedDrawDate.toISOString().split('T')[0];
  console.log('🧪 Testing number cap system:', { 
    subType: initialState.subType, 
    drawDate,
    cacheCount: managedNumbersCache.length,
    contextCount: managedNumbers.length 
  });
  
  // ทดสอบเลข 123 สามตัวบน
  const testResult = getNumberCapAction('123', 3, 'บน', initialState.subType, drawDate);
  console.log('🧪 Test result for 123:', testResult);
  
  if (testResult) {
    toast.success(`✅ ระบบเลขอั้นทำงาน: เลข 123 ${testResult.action === 'close' ? 'ปิดรับ' : 'หารครึ่ง'}`);
  } else {
    toast.info('ℹ️ เลข 123 ไม่อยู่ในระบบเลขอั้น');
  }
};
```

### 3. ปรับปรุง NumberCapIndicator (components/lottery/NumberCapIndicator.tsx)

#### a) เพิ่ม Error Handling และ Loading State
```typescript
// แสดง error state
if (error) {
  return (
    <Card className="mb-4 border-red-200 bg-red-50/50">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">เกิดข้อผิดพลาด: {error}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// แสดง loading state
if (loading) {
  return (
    <Card className="mb-4 border-gray-200 bg-gray-50/50">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Info className="h-4 w-4 animate-spin" />
          <span className="text-sm">กำลังโหลดข้อมูลเลขอั้น...</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### b) เพิ่มการแจ้งเตือนอัตโนมัติ
```typescript
// แสดงการแจ้งเตือนเมื่อมีเลขอั้น
if (formattedData.length > 0) {
  const closeCount = formattedData.filter(n => n.action === 'close').length;
  const halfCount = formattedData.filter(n => n.action === 'half').length;
  
  if (closeCount > 0) {
    toast.warning(`🚫 มีเลขปิดรับ ${closeCount} เลข สำหรับ ${lotterySubTypeName || 'หวยนี้'}`, { 
      duration: 4000,
      description: `วันที่ ${drawDate}`
    });
  }
  
  if (halfCount > 0) {
    toast.info(`✂️ มีเลขหารครึ่ง ${halfCount} เลข สำหรับ ${lotterySubTypeName || 'หวยนี้'}`, { 
      duration: 3000,
      description: `วันที่ ${drawDate}`
    });
  }
}
```

## วิธีการทดสอบ

### 1. การทดสอบในหน้า Lottery Orders
1. เข้าสู่หน้าสร้างรายการหวย
2. คลิกปุ่ม "🧪 ทดสอบ" ในส่วน header
3. ดูผลลัพธ์ใน console และ toast notification

### 2. การทดสอบด้วย Console
```javascript
// ใน browser console
console.log('Testing number cap system...');

// ดูข้อมูลใน context
console.log('Managed numbers count:', managedNumbers.length);

// ทดสอบฟังก์ชันตรวจสอบ
const result = getUniversalNumberCapAction('123', 3, 'บน', 16, '2025-07-14');
console.log('Test result:', result);
```

### 3. การตรวจสอบใน Database
```sql
-- ตรวจสอบข้อมูลในตาราง managed_numbers
SELECT * FROM managed_numbers 
WHERE lottery_sub_type_id = 16 
AND draw_date = '2025-07-14';

-- ตรวจสอบว่ามีข้อมูลเลขอั้นหรือไม่
SELECT 
  lottery_sub_type_id,
  draw_date,
  COUNT(*) as total_numbers,
  COUNT(CASE WHEN action = 'close' THEN 1 END) as closed_numbers,
  COUNT(CASE WHEN action = 'half' THEN 1 END) as half_numbers
FROM managed_numbers 
GROUP BY lottery_sub_type_id, draw_date;
```

## การแก้ไขปัญหาเพิ่มเติม

### หากยังคงมีปัญหา

1. **ล้าง Browser Cache และ Cookies**
2. **Restart Development Server**
3. **ตรวจสอบ Network Tab** ใน DevTools ว่ามี API calls ไปยัง managed_numbers หรือไม่
4. **ตรวจสอบ Database Connection** และ Supabase configuration
5. **ดู Console Logs** สำหรับ error messages ที่อาจเกิดขึ้น

### การ Debug เพิ่มเติม

```typescript
// เพิ่ม logging เพิ่มเติมใน component
useEffect(() => {
  console.log('🔍 Component state:', {
    initialState,
    selectedDraw,
    managedNumbersCache: managedNumbersCache.length,
    managedNumbers: managedNumbers.length
  });
}, [initialState, selectedDraw, managedNumbersCache, managedNumbers]);
```

## สรุป

การแก้ไขนี้จะช่วยให้:
1. **หยุด Infinite Loop** ที่ทำให้ performance ช้า
2. **ลด Debug Logs** ที่ซ้ำซ้อน
3. **เพิ่ม Error Handling** ที่ดีขึ้น
4. **เพิ่มการแจ้งเตือน** เมื่อมีเลขอั้น
5. **เพิ่มฟังก์ชันทดสอบ** สำหรับ debugging

ระบบตรวจสอบเลขอั้นควรทำงานได้ปกติและแสดงการแจ้งเตือนเมื่อพบเลขอั้นแล้ว 