# ตัวอย่างการใช้งานระบบเชื่อมโยงเลขอั้น

## สถานการณ์ที่ 1: Admin กำหนดเลขอั้น

### ขั้นตอนที่ 1: เข้าหน้าจัดการ
```tsx
// ในหน้า lotterysubtype (admin)
{isGovernmentLottery(item.lottery_sub_type_id) ? (
  <Button onClick={() => openGovLotteryAnalyzer(item.lottery_sub_type_id)}>
    เลขอั้น
  </Button>
) : (
  <Button onClick={() => openAnimalDialog(item.lottery_sub_type_id)}>
    สัตว์
  </Button>
)}
```

### ขั้นตอนที่ 2: วิเคราะห์และกำหนดเลขอั้น
```tsx
// ใน GovernmentLotteryAnalyzer
const sampleAnalysis = {
  high_risk_numbers: [
    { number: "123", risk_percentage: 100.0 },
    { number: "456", risk_percentage: 96.0 },
    { number: "789", risk_percentage: 85.0 }
  ],
  medium_risk_numbers: [
    { number: "012", risk_percentage: 45.0 },
    { number: "345", risk_percentage: 38.0 }
  ]
};

// เลือกเลขและกำหนดการจัดการ
const handleSelectAction = (action: 'half' | 'close') => {
  addSelectedToManaged(action);
  setActionDialogOpen(false);
};
```

### ขั้นตอนที่ 3: บันทึกลง Context
```tsx
// เมื่อมีการเปลี่ยนแปลง managedNumbers
useEffect(() => {
  if (managedNumbers.length > 0) {
    const numbersWithContext = managedNumbers.map(n => ({
      ...n,
      lottery_sub_type_id,
      draw_date: selectedDate
    }));
    updateManagedNumbersForSubType(lottery_sub_type_id, selectedDate, numbersWithContext);
  }
}, [managedNumbers, lottery_sub_type_id, selectedDate]);
```

## สถานการณ์ที่ 2: User สั่งซื้อหวย

### ขั้นตอนที่ 1: เข้าหน้าสั่งซื้อ
```tsx
// ใน lottery-orders
useEffect(() => {
  if (initialState.subType && selectedDraw) {
    fetchManagedNumbers(initialState.subType, selectedDraw.date.toISOString().split('T')[0]);
  }
}, [initialState.subType, selectedDraw, fetchManagedNumbers]);
```

### ขั้นตอนที่ 2: แสดงข้อมูลเลขอั้น
```tsx
// แสดง NumberCapIndicator
{initialState.subType === 1 && selectedDraw && (
  <NumberCapIndicator 
    subTypeId={initialState.subType} 
    drawDate={selectedDraw.date.toISOString().split('T')[0]}
    showStats={true}
  />
)}
```

### ขั้นตอนที่ 3: ตรวจสอบเลขอั้นขณะเพิ่ม
```tsx
const handleAddOrder = (inputNumber: string) => {
  // ตรวจสอบเลขอั้นเฉพาะหวยรัฐบาล
  if (initialState.subType === 1 && selectedDraw) {
    const numberStatus = checkNumberStatus(
      num,
      prize.category === 'three' ? 3 : prize.category === 'two' ? 2 : 1,
      prize.display_name.includes('บน') ? 'บน' : 'ล่าง',
      initialState.subType
    );

    if (numberStatus) {
      if (numberStatus.action === 'close') {
        toast.error(`❌ เลข ${num} ถูกปิดรับแล้ว (${numberStatus.reason})`);
        return; // ไม่ให้เพิ่ม
      } else if (numberStatus.action === 'half') {
        toast.warning(`✂️ เลข ${num} อยู่ในระบบหารครึ่ง (${numberStatus.reason})`);
        // ให้เพิ่มได้ แต่จะลดราคา
      }
    }
  }
  
  // เพิ่มรายการตามปกติ
  setOrders(prev => [...prev, ...newOrders]);
};
```

### ขั้นตอนที่ 4: การปรับราคาอัตโนมัติ
```tsx
const handleQuickPriceSet = (price: number) => {
  setOrderPrices(prev => {
    const newPrices = { ...prev };
    targetIds.forEach(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        let finalPrice = price;
        
        // ตรวจสอบเลขอั้นสำหรับหวยรัฐบาล
        if (initialState.subType === 1 && selectedDraw) {
          const numberStatus = checkNumberStatus(/*...*/);
          
          if (numberStatus?.action === 'half') {
            finalPrice = Math.floor(price / 2); // ลดราคาครึ่งหนึ่ง
          }
        }
        
        newPrices[orderId] = {
          ...newPrices[orderId],
          amount: finalPrice.toString()
        };
      }
    });
    return newPrices;
  });
};
```

### ขั้นตอนที่ 5: แสดง Visual Indicators
```tsx
// แสดงตัวบ่งชี้ในรายการ
{(() => {
  const numberStatus = getOrderNumberStatus(order);
  if (numberStatus) {
    return (
      <div className="flex items-center ml-1">
        {numberStatus.action === 'half' && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded" title={numberStatus.reason}>
            ✂️
          </span>
        )}
        {numberStatus.action === 'close' && (
          <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded" title={numberStatus.reason}>
            🚫
          </span>
        )}
      </div>
    );
  }
  return null;
})()}
```

## สถานการณ์ที่ 3: การทำงานร่วมกัน

### Admin กำหนดเลขอั้น
```tsx
// 1. Admin เปิด GovernmentLotteryAnalyzer
// 2. เลือกเลข "123" และกำหนด action: "close"
// 3. บันทึกลง Context:
{
  number: "123",
  digit_count: 3,
  type_number: "บน",
  action: "close",
  reason: "ความเสี่ยง 100%+",
  is_manual: false,
  lottery_sub_type_id: 1,
  draw_date: "2024-01-15"
}
```

### User พยายามเพิ่มเลขดังกล่าว
```tsx
// User เลือกเลข "123" สามตัวบน
handleAddOrder("123");

// ระบบตรวจสอบ:
const numberStatus = checkNumberStatus("123", 3, "บน", 1);
// ได้ผลลัพธ์: { action: "close", reason: "ความเสี่ยง 100%+" }

// แสดงข้อความข้อผิดพลาด:
toast.error("❌ เลข 123 ถูกปิดรับแล้ว (ความเสี่ยง 100%+)");
return; // ไม่ให้เพิ่ม
```

### User เพิ่มเลขที่หารครึ่ง
```tsx
// User เลือกเลข "456" สามตัวบน
handleAddOrder("456");

// ระบบตรวจสอบ:
const numberStatus = checkNumberStatus("456", 3, "บน", 1);
// ได้ผลลัพธ์: { action: "half", reason: "ความเสี่ยง 96.0%" }

// แสดงข้อความเตือน:
toast.warning("✂️ เลข 456 อยู่ในระบบหารครึ่ง (ความเสี่ยง 96.0%)");

// เพิ่มรายการได้ และเมื่อใส่ราคา:
handleQuickPriceSet(100); // ราคาต้นฉบับ 100 บาท
// ระบบจะปรับเป็น 50 บาทอัตโนมัติ
```

## สรุปประโยชน์

1. **ความปลอดภัย**: ป้องกันการรับเลขที่เสี่ยงสูงเกินไป
2. **ประสิทธิภาพ**: ปรับราคาอัตโนมัติตามความเสี่ยง
3. **ความโปร่งใส**: แสดงสถานะเลขอั้นให้ user เห็นชัดเจน
4. **การจัดการง่าย**: Admin สามารถควบคุมเลขอั้นได้แบบ real-time
5. **ประสบการณ์ผู้ใช้**: UX ที่ราบรื่นพร้อมข้อมูลที่เพียงพอ 