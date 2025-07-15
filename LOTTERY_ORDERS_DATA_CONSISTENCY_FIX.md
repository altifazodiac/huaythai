# การแก้ไขปัญหาความสัมพันธ์ของข้อมูลระหว่าง Lottery Orders และ Summary

## ปัญหาที่พบ

### 1. การดึงข้อมูลไม่สัมพันธ์กัน
- หน้า `lottery-orders` ใช้ `handle_lottery_order` RPC function
- หน้า `summary` ใช้ `get_daily_lottery_summary`, `get_lottery_type_summary`, `get_bill_summary` RPC functions
- ข้อมูลที่บันทึกและข้อมูลที่แสดงผลอาจไม่ตรงกัน

### 2. โครงสร้างข้อมูลไม่สอดคล้อง
- `lottery-orders` บันทึกข้อมูลใน `lottery_tickets` และ `lottery_ticket_items`
- `summary` คาดหวังข้อมูลในรูปแบบที่แตกต่าง

### 3. การจัดการเลขอั้นไม่สอดคล้อง
- ใช้ทั้ง `fetchDirectManagedNumbers` และ `fetchManagedNumbers` 
- มีการตรวจสอบเลขอั้นซ้ำซ้อน

## การแก้ไขที่ทำ

### 1. ปรับปรุงการบันทึกข้อมูลใน lottery-orders

#### ไฟล์: `app/(protected)/lottery-orders/page.tsx`

**การปรับปรุง:**
- เพิ่มการตรวจสอบข้อมูลก่อนบันทึก
- เพิ่ม logging เพื่อ debug
- ปรับปรุงการเตรียมข้อมูลให้ตรงกับ RPC function

```typescript
// เพิ่มการตรวจสอบและปรับปรุงข้อมูลให้ถูกต้อง
const prize = prizeInfo.find(p => p.id === order.prizeId);
if (!prize) {
  throw new Error(`ไม่พบข้อมูลรางวัลสำหรับ ID: ${order.prizeId}`);
}

// เพิ่ม logging
console.log('Sending order data:', {
  p_user_id: user.id,
  p_bill_name: billName,
  p_bill_number: billNumber,
  p_draw_date: selectedDraw.date.toISOString().split('T')[0],
  p_draw_time: selectedDraw.schedule.draw_time,
  p_close_time: selectedDraw.schedule.close_time,
  p_total_amount: totalPayment,
  p_ticket_items: itemsToInsert,
});
```

### 2. ปรับปรุงการดึงข้อมูลเลขอั้น

**การปรับปรุง:**
- เพิ่ม logging เพื่อ debug
- ปรับปรุงการตรวจสอบเลขอั้นให้มีประสิทธิภาพ

```typescript
// เพิ่ม logging
console.log(`Fetching managed numbers for subType: ${subTypeId}, drawDate: ${drawDate}`);
console.log(`Found ${data?.length || 0} managed numbers`);
console.log(`Checking number cap for: ${num} (${digitCount} digits, ${typeNumber})`);
console.log(`Number ${num} status: ${numberStatus.action} - ${numberStatus.reason}`);
```

### 3. สร้าง RPC Functions ที่สัมพันธ์กัน

#### ไฟล์: `supabase/migrations/20250124000000_create_summary_rpc_functions.sql`

**RPC Functions ที่สร้าง:**
- `get_daily_lottery_summary()` - สรุปข้อมูลรายวัน
- `get_lottery_type_summary(p_draw_date)` - สรุปข้อมูลตามประเภทหวย
- `get_bill_summary(p_draw_date, p_lottery_type_id)` - สรุปข้อมูลตามบิล
- `get_number_details(p_bill_number)` - รายละเอียดเลข

**การออกแบบ:**
- ใช้ข้อมูลจาก `lottery_tickets` และ `lottery_ticket_items` ที่บันทึกจาก `handle_lottery_order`
- เชื่อมโยงกับ `lottery_winnings` เพื่อคำนวณผลรางวัล
- เชื่อมโยงกับ `profiles` เพื่อดึงชื่อผู้ใช้
- เชื่อมโยงกับ `lottery_sub_types` และ `lottery_sub_number` เพื่อดึงข้อมูลประเภทหวย

### 4. ปรับปรุงการดึงข้อมูล Prize Data

**การปรับปรุง:**
- เพิ่ม logging เพื่อ debug
- ปรับปรุงการ map ข้อมูลให้ถูกต้อง

```typescript
console.log(`Fetching prize data for subType: ${initialState.subType}`);
console.log(`Found ${data.length} prize configurations`);
console.log('Mapped prize data:', mappedData);
```

## ผลลัพธ์ที่คาดหวัง

### 1. ข้อมูลสัมพันธ์กัน
- ข้อมูลที่บันทึกจาก `lottery-orders` จะแสดงผลใน `summary` ได้ถูกต้อง
- การคำนวณยอดขาย กำไร/ขาดทุน จะแม่นยำ

### 2. ประสิทธิภาพดีขึ้น
- ลดการดึงข้อมูลซ้ำซ้อน
- การตรวจสอบเลขอั้นมีประสิทธิภาพมากขึ้น

### 3. Debug ง่ายขึ้น
- มี logging ที่ชัดเจน
- สามารถติดตามการทำงานได้ง่าย

## วิธีการ Deploy

### 1. รัน Migration
```bash
# รัน migration ใหม่
supabase db push
```

### 2. ตรวจสอบ RPC Functions
```sql
-- ตรวจสอบว่า functions ถูกสร้างแล้ว
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_%';
```

### 3. ทดสอบการทำงาน
- สร้างรายการหวยในหน้า `lottery-orders`
- ตรวจสอบข้อมูลในหน้า `summary`
- ตรวจสอบ console logs เพื่อ debug

## หมายเหตุ

- การแก้ไขนี้จะทำให้ข้อมูลระหว่าง `lottery-orders` และ `summary` สัมพันธ์กัน
- ควรทดสอบการทำงานหลังจาก deploy
- หากพบปัญหา ให้ตรวจสอบ console logs และ database logs 