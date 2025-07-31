# การแก้ไขการนับถอยหลังสำหรับกรณีวันที่ 1-31

## ปัญหาที่พบ

การนับถอยหลังสำหรับกรณีวันที่ 1-31 (เช่น "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31") ไม่ทำงานอย่างถูกต้อง เนื่องจาก:

1. ไม่มีการตรวจสอบรูปแบบวันที่ 1-31 ใน `CountdownRow.tsx`
2. ไม่มีการจัดการการคำนวณวันที่ถัดไปสำหรับกรณีนี้
3. การแสดงผลไม่เหมาะสมสำหรับกรณีวันที่ 1-31
4. **ปัญหาใหม่**: เมื่อเป็นวันที่เปิดรับ (เช่น วันที่ 31) ระบบยังแสดง "เหลืออีก 1 วัน" แทนที่จะนับเวลาถอยหลัง

## การแก้ไข

### 1. CountdownRow.tsx

#### เพิ่มตรรกะการตรวจสอบวันที่ 1-31:
```typescript
// ตรวจสอบว่าเป็นรูปแบบวันที่ 1-31 หรือไม่
const isDateRange = /^\d+(?:,\s*\d+)*$/.test(schedule.day_of_week.trim());

if (isDateRange) {
  // กรณีวันที่ 1-31
  const dateNumbers = schedule.day_of_week.split(',').map(d => parseInt(d.trim(), 10)).filter(d => d >= 1 && d <= 31);
  
  // ตรวจสอบว่าวันนี้เป็นวันที่เปิดรับหรือไม่
  const isTodayOpenDay = dateNumbers.includes(currentDay);
  
  if (isTodayOpenDay) {
    // วันนี้เป็นวันที่เปิดรับ
    const todayOpenTime = new Date(currentYear, currentMonth, currentDay, openH, openM, 0);
    const todayCloseTime = new Date(currentYear, currentMonth, currentDay, closeH, closeM, 0);
    
    if (now < todayOpenTime) {
      // ยังไม่ถึงเวลาเปิดรับ
      targetTime = todayOpenTime;
      prefix = "เปิดรับใน";
      color = "text-yellow-300";
    } else if (now >= todayOpenTime && now < todayCloseTime) {
      // กำลังเปิดรับ
      targetTime = todayCloseTime;
      prefix = "ปิดรับใน";
      color = "text-yellow-300";
    } else {
      // เลยเวลาเปิดรับแล้ว หาวันถัดไป
      // ... ตรรกะการหาวันถัดไป
    }
  } else {
    // วันนี้ไม่ใช่วันที่เปิดรับ หาวันถัดไป
    // ... ตรรกะการหาวันถัดไป
  }
}
```

#### ปรับปรุงการแสดงผล:
```typescript
// สำหรับกรณีวันที่ 1-31 แสดงเวลาถอยหลัง
if (isDateRange) {
  // ตรวจสอบว่ากำลังเปิดรับในวันนี้หรือไม่
  const currentDay = now.getDate();
  const dateNumbers = schedule.day_of_week.split(',').map(d => parseInt(d.trim(), 10)).filter(d => d >= 1 && d <= 31);
  const isTodayOpenDay = dateNumbers.includes(currentDay);
  const todayOpenTime = new Date(now.getFullYear(), now.getMonth(), currentDay, openH, openM, 0);
  const todayCloseTime = new Date(now.getFullYear(), now.getMonth(), currentDay, closeH, closeM, 0);
  const isCurrentlyOpenToday = isTodayOpenDay && now >= todayOpenTime && now < todayCloseTime;
  
  if (isCurrentlyOpenToday) {
    // กำลังเปิดรับในวันนี้ แสดงเวลาถอยหลังแบบละเอียด
    if (d > 0) {
      timeParts.push(`${d} วัน`);
    }
    if (h > 0 || d > 0) {
      timeParts.push(`${String(h).padStart(2, '0')} ชั่วโมง`);
    }
    if (m > 0 || h > 0 || d > 0) {
      timeParts.push(`${String(m).padStart(2, '0')} นาที`);
    }
    timeParts.push(`${String(s).padStart(2, '0')} วินาที`);
  } else {
    // ไม่ได้เปิดรับในวันนี้ แสดงเป็นวันเท่านั้น
    if (d > 0) {
      timeParts.push(`${d} วัน`);
    } else if (h > 0) {
      timeParts.push(`${h} ชั่วโมง`);
    } else if (m > 0) {
      timeParts.push(`${m} นาที`);
    } else {
      timeParts.push(`${s} วินาที`);
    }
  }
}
```

### 2. LotteryTypeGrid.tsx

#### เพิ่มตรรกะการตรวจสอบใน isOpenNow:
```typescript
// ตรวจสอบว่าเป็นรูปแบบวันที่ 1-31 หรือไม่
const isDateRange = /^\d+(?:,\s*\d+)*$/.test(schedule.day_of_week.trim());

if (isDateRange) {
  // กรณีวันที่ 1-31
  const dateNumbers = schedule.day_of_week.split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => d >= 1 && d <= 31);
  
  // ตรรกะการตรวจสอบการเปิดรับสำหรับวันที่ 1-31
  // ...
}
```

#### ปรับปรุงฟังก์ชัน isMonthlyDraw:
```typescript
function isMonthlyDraw(schedule: any) {
  if (!schedule?.day_of_week) return false;
  
  // ตรวจสอบกรณีวันที่ 1-31
  const isDateRange = /^\d+(?:,\s*\d+)*$/.test(schedule.day_of_week.trim());
  if (isDateRange) return true;
  
  // ตรวจสอบกรณี "ของเดือน"
  return schedule.day_of_week.includes("ของเดือน");
}
```

#### ปรับปรุงการแสดงผล:
```typescript
if (isDateRange) {
  // กรณีวันที่ 1-31 ใช้ CountdownRow ใหม่
  return <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />;
}
```

## ผลลัพธ์

1. **รองรับรูปแบบวันที่ 1-31**: สามารถรับรูปแบบ "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31"
2. **การคำนวณวันที่ถัดไป**: หาวันที่ถัดไปในเดือนปัจจุบัน หรือเดือนถัดไปถ้าเลยไปแล้ว
3. **การแสดงผลที่เหมาะสม**: 
   - เมื่อกำลังเปิดรับในวันนั้น: แสดงเวลาถอยหลังแบบละเอียด (วัน ชั่วโมง นาที วินาที)
   - เมื่อไม่ได้เปิดรับ: แสดงเป็นวันเท่านั้น
4. **การตรวจสอบการเปิดรับ**: ตรวจสอบว่ากำลังเปิดรับหรือไม่สำหรับวันที่ 1-31
5. **แก้ไขปัญหา**: เมื่อเป็นวันที่เปิดรับ (เช่น วันที่ 31) ระบบจะนับเวลาถอยหลังแทนที่จะแสดง "เหลืออีก 1 วัน"

## ตัวอย่างการใช้งาน

```typescript
// รูปแบบที่รองรับ
"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31"
"1,15,30"
"1,2,3"
```

## การทดสอบ

1. ทดสอบกับวันที่ 1-31 ต่างๆ
2. ทดสอบการเปลี่ยนเดือน
3. ทดสอบการเปลี่ยนปี
4. ทดสอบการแสดงผลนับถอยหลัง
5. ทดสอบการตรวจสอบการเปิดรับ
6. **ทดสอบใหม่**: เมื่อเป็นวันที่เปิดรับ (เช่น วันที่ 31) ควรแสดงเวลาถอยหลังแทนที่จะแสดง "เหลืออีก 1 วัน"

## กรณีทดสอบเฉพาะ

### กรณีที่ 1: วันที่ 31 กำลังเปิดรับ
- **ข้อมูล**: "1,31 ของเดือน", เปิดรับ 07:00, ปิดรับ 20:57
- **เวลาปัจจุบัน**: วันที่ 31 เวลา 15:30
- **ผลลัพธ์ที่คาดหวัง**: "ปิดรับใน 05:27:00" (นับเวลาถอยหลัง)

### กรณีที่ 2: วันที่ 31 เลยเวลาเปิดรับแล้ว
- **ข้อมูล**: "1,31 ของเดือน", เปิดรับ 07:00, ปิดรับ 20:57
- **เวลาปัจจุบัน**: วันที่ 31 เวลา 22:00
- **ผลลัพธ์ที่คาดหวัง**: "รอบถัดไป 1 วัน" (นับไปวันที่ 1 เดือนถัดไป)

### กรณีที่ 3: วันที่ 15 (ไม่ใช่วันที่เปิดรับ)
- **ข้อมูล**: "1,31 ของเดือน", เปิดรับ 07:00, ปิดรับ 20:57
- **เวลาปัจจุบัน**: วันที่ 15 เวลา 15:30
- **ผลลัพธ์ที่คาดหวัง**: "รอบถัดไป 16 วัน" (นับไปวันที่ 31 เดือนนี้) 