# ระบบจัดการเลขอั้นแบบครอบคลุม (Universal Number Cap System)

## ภาพรวม

ระบบจัดการเลขอั้นแบบครอบคลุมได้รับการพัฒนาขึ้นเพื่อทดแทนระบบเลขสัตว์เดิม และขยายการใช้งานให้ครอบคลุมทุกประเภทหวย ไม่ใช่เฉพาะหวยรัฐบาลเท่านั้น

## คุณสมบัติหลัก

### 1. การรองรับทุกประเภทหวย
- **หวยรัฐบาล** (lottery_sub_type_id = 1)
- **หวยลาว** (lottery_sub_type_id = 3, 13, 15-25)
- **หวยฮานอย** (lottery_sub_type_id = 7, 26-32)
- **หวยหุ้น** (นิเคอิ, ฮั่งเส็ง, เกาหลี, ไต้หวัน, จีน, ฯลฯ)
- **หวยต่างประเทศ** (สิงคโปร์, รัสเซีย, เยอรมัน, อังกฤษ, ฯลฯ)

### 2. ประเภทการจัดการ
- **หารครึ่ง (half)**: ลดราคาเป็นครึ่งหนึ่ง
- **ปิดรับ (close)**: ไม่รับเลขนั้นๆ เลย

### 3. ประเภทเลข
- **3 ตัวบน**: เลข 3 หลักแบบตรง
- **3 ตัวโต๊ด**: เลข 3 หลักแบบเรียงใหม่
- **2 ตัวบน**: เลข 2 หลักบน
- **2 ตัวล่าง**: เลข 2 หลักล่าง
- **วิ่งบน**: เลข 1 หลักบน
- **วิ่งล่าง**: เลข 1 หลักล่าง

## สถาปัตยกรรมระบบ

### 1. Database Schema
```sql
-- ตาราง managed_numbers
CREATE TABLE public.managed_numbers (
    id UUID PRIMARY KEY,
    lottery_sub_type_id INTEGER NOT NULL,
    number VARCHAR(10) NOT NULL,
    digit_count INTEGER NOT NULL CHECK (digit_count IN (1, 2, 3)),
    type_number VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('half', 'close')),
    reason TEXT,
    is_manual BOOLEAN DEFAULT false,
    draw_date DATE NOT NULL,
    risk_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(lottery_sub_type_id, number, digit_count, type_number, draw_date)
);
```

### 2. React Context (NumberCapContext)
```typescript
interface ManagedNumber {
  number: string;
  digit_count: number;
  type_number: string;
  action: 'half' | 'close';
  reason: string;
  is_manual: boolean;
  lottery_sub_type_id: number;
  draw_date: string;
  risk_percentage?: number;
}

interface NumberCapContextType {
  managedNumbers: ManagedNumber[];
  addManagedNumber: (number: ManagedNumber) => void;
  removeManagedNumber: (key: string) => void;
  updateManagedNumbersForSubType: (subTypeId: number, drawDate: string, numbers: ManagedNumber[]) => void;
  fetchManagedNumbers: (subTypeId: number, drawDate: string) => void;
  checkNumberStatus: (number: string, digitCount: number, typeNumber: string, subTypeId?: number) => any;
  // Enhanced functions
  getNumberCapsBySubType: (subTypeId: number, drawDate: string) => ManagedNumber[];
  getNumberCapStatsBySubType: (subTypeId: number, drawDate: string) => NumberCapStats;
  isUniversalNumberCapped: (number: string, digitCount: number, typeNumber: string, subTypeId: number, drawDate: string) => boolean;
  getUniversalNumberCapAction: (number: string, digitCount: number, typeNumber: string, subTypeId: number, drawDate: string) => {action: string, reason: string} | null;
}
```

### 3. คอมโพเนนต์หลัก

#### UniversalNumberCapAnalyzer
- แทนที่ GovernmentLotteryAnalyzer เดิม
- รองรับทุกประเภทหวย
- วิเคราะห์ความเสี่ยงจากยอดขายจริง
- จัดการเลขอั้นแบบ real-time

#### NumberCapIndicator
- แสดงสถิติเลขอั้นแบบ real-time
- รองรับทุกประเภทหวย
- แสดงจำนวนเลขที่หารครึ่ง/ปิดรับ

## การใช้งาน

### 1. สำหรับ Admin (lotterysubtype/page.tsx)
```typescript
// เปิดระบบจัดการเลขอั้น
const openNumberCapAnalyzer = (lottery_sub_type_id: number) => {
  setNumberCapSubTypeId(lottery_sub_type_id);
  setNumberCapAnalyzerOpen(true);
};

// ปุ่มเลขอั้นสำหรับทุกประเภท (แทนที่ปุ่มสัตว์)
<Button onClick={() => openNumberCapAnalyzer(item.lottery_sub_type_id)}>
  เลขอั้น
</Button>
```

### 2. สำหรับ User (lottery-orders/page.tsx)
```typescript
// ตรวจสอบเลขอั้นสำหรับทุกประเภทหวย
const getOrderNumberStatus = (order: Order) => {
  if (!initialState.subType || !selectedDrawDate) return null;
  
  const prizeData = prizeInfo.find(p => p.id === order.prizeId);
  if (!prizeData) return null;
  
  // กำหนดประเภทเลขตาม category
  let digitCount = 3;
  let typeNumber = 'บน';
  
  if (prizeData.category === 'three') {
    digitCount = 3;
    typeNumber = prizeData.display_name.includes('โต๊ด') ? 'โต๊ด' : 'บน';
  } else if (prizeData.category === 'two') {
    digitCount = 2;
    typeNumber = prizeData.display_name.includes('ล่าง') ? 'ล่าง' : 'บน';
  } else if (prizeData.category === 'run') {
    digitCount = 1;
    typeNumber = prizeData.display_name.includes('ล่าง') ? 'วิ่งล่าง' : 'วิ่งบน';
  }
  
  const drawDate = selectedDrawDate.toISOString().split('T')[0];
  return getUniversalNumberCapAction(order.numbers, digitCount, typeNumber, initialState.subType, drawDate);
};
```

### 3. การแสดงผลใน UI
```typescript
// ตัวบ่งชี้เลขอั้นสำหรับทุกประเภทหวย
{initialState.subType && selectedDrawDate && (
  <NumberCapIndicator 
    subTypeId={initialState.subType} 
    drawDate={selectedDrawDate.toISOString().split('T')[0]}
    showStats={true}
    lotterySubTypeName={subTypeObj?.sub_type_name}
  />
)}

// การแสดงสถานะเลขอั้นในรายการ
{(() => {
  const numberStatus = getOrderNumberStatus(order);
  if (numberStatus) {
    return (
      <div className="flex items-center ml-1">
        {numberStatus.action === 'half' && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded flex items-center" title={numberStatus.reason}>
            ✂️
          </span>
        )}
        {numberStatus.action === 'close' && (
          <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded flex items-center" title={numberStatus.reason}>
            🚫
          </span>
        )}
      </div>
    );
  }
})()}
```

## ขั้นตอนการทำงาน

### 1. วิเคราะห์ความเสี่ยง
1. Admin เปิดระบบจัดการเลขอั้นสำหรับประเภทหวยใดๆ
2. ระบบวิเคราะห์ยอดขายจริงจากฐานข้อมูล
3. คำนวณความเสี่ยงตาม potential payout vs total sales
4. แสดงเลขที่เสี่ยงสูง/ปานกลาง/ปลอดภัย

### 2. จัดการเลขอั้น
1. Admin เลือกเลขที่ต้องการจัดการ
2. เลือกการกระทำ: หารครึ่ง หรือ ปิดรับ
3. ระบุเหตุผล
4. บันทึกลงฐานข้อมูล

### 3. การใช้งานของผู้ใช้
1. ผู้ใช้เลือกหวยประเภทใดๆ
2. เมื่อเพิ่มเลข ระบบตรวจสอบเลขอั้นอัตโนมัติ
3. หากเป็นเลขปิดรับ: แสดงข้อผิดพลาด ไม่ให้เพิ่ม
4. หากเป็นเลขหารครึ่ง: แสดงคำเตือน ลดราคาครึ่งหนึ่ง

## ข้อดีของระบบใหม่

### 1. ความครอบคลุม
- รองรับทุกประเภทหวย (65+ ประเภท)
- ไม่จำกัดเฉพาะหวยรัฐบาล
- ระบบเดียวจัดการได้ทั้งหมด

### 2. ความยืดหยุ่น
- สามารถเพิ่มประเภทหวยใหม่ได้ง่าย
- ปรับแต่งเกณฑ์ความเสี่ยงได้
- รองรับการจัดการแบบ manual และ auto

### 3. ประสิทธิภาพ
- ใช้ฐานข้อมูลแทน localStorage
- มี indexing สำหรับการค้นหาเร็ว
- Real-time updates

### 4. ความปลอดภัย
- RLS (Row Level Security) ป้องกันข้อมูล
- Audit trail ด้วย created_by และ timestamps
- Validation ที่ database level

## การพัฒนาต่อยอด

### 1. Real-time Updates
- ใช้ Supabase Realtime สำหรับ live updates
- แจ้งเตือนเมื่อมีการเปลี่ยนแปลงเลขอั้น

### 2. Advanced Analytics
- กราฟแสดงแนวโน้มเลขอั้น
- รายงานสถิติการจัดการ
- AI prediction สำหรับเลขเสี่ยง

### 3. API Integration
- REST API สำหรับระบบภายนอก
- Webhook notifications
- Batch operations

### 4. Mobile Optimization
- PWA support
- Offline capability
- Push notifications

## การ Migration

### จาก localStorage เป็น Database
```typescript
// Old: localStorage
const managedNumbers = JSON.parse(localStorage.getItem('managedNumbers') || '[]');

// New: Database
const { data: managedNumbers } = await supabase
  .from('managed_numbers')
  .select('*')
  .eq('lottery_sub_type_id', subTypeId)
  .eq('draw_date', drawDate);
```

### จาก Government-only เป็น Universal
```typescript
// Old: เฉพาะหวยรัฐบาล
if (initialState.subType === 1) {
  // check number cap
}

// New: ทุกประเภทหวย
if (initialState.subType && selectedDrawDate) {
  const numberStatus = getUniversalNumberCapAction(
    number, digitCount, typeNumber, initialState.subType, drawDate
  );
}
```

## สรุป

ระบบจัดการเลขอั้นแบบครอบคลุมช่วยให้:
- Admin จัดการเลขอั้นได้ทุกประเภทหวย
- ผู้ใช้ได้รับการป้องกันเลขอั้นอัตโนมัติ
- ระบบมีประสิทธิภาพและปลอดภัยมากขึ้น
- รองรับการขยายตัวในอนาคต

ระบบนี้แทนที่ปุ่มสัตว์เดิมทั้งหมด และให้ความสามารถที่ครอบคลุมกว่าเดิมอย่างมาก 