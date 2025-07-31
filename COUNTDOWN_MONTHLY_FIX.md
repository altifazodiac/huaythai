# การแก้ไขการนับถอยหลังสำหรับกรณี "ของเดือน"

## ปัญหาที่พบ

จากการตรวจสอบรูปภาพ พบว่าข้อมูลเป็นรูปแบบ **"1, 31 ของเดือน"** ซึ่งเป็นรูปแบบ "ของเดือน" ไม่ใช่รูปแบบวันที่ 1-31 ที่เราแก้ไขไปก่อนหน้านี้

### ปัญหาหลัก:
1. **ข้อมูลจริง**: "1, 31 ของเดือน" (รูปแบบ "ของเดือน")
2. **ตรรกะเดิม**: ไม่มีการตรวจสอบว่าวันนี้เป็นวันที่เปิดรับหรือไม่
3. **การแสดงผล**: แสดง "เหลืออีก 1 วัน" แทนที่จะนับเวลาถอยหลัง

## การแก้ไข

### 1. ปรับปรุงตรรกะสำหรับกรณี "ของเดือน"

#### เพิ่มการตรวจสอบวันที่เปิดรับ:
```typescript
} else if (schedule.day_of_week.includes("ของเดือน")) {
  // --- ตรรกะสำหรับรายการ "ของเดือน" ---
  const match = schedule.day_of_week.match(/(\d+)(?:[,\s]+(\d+))?\s*ของเดือน/);
  let daysOfMonth: number[] = [];
  if (match) {
    daysOfMonth.push(parseInt(match[1], 10));
    if (match[2]) {
      daysOfMonth.push(parseInt(match[2], 10));
    }
    daysOfMonth.sort((a, b) => a - b);
  }

  if (daysOfMonth.length > 0) {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // ตรวจสอบว่าวันนี้เป็นวันที่เปิดรับหรือไม่
    const isTodayOpenDay = daysOfMonth.includes(currentDay);
    
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
}
```

### 2. ปรับปรุงการแสดงผล

#### รวมตรรกะการแสดงผลสำหรับกรณี "ของเดือน":
```typescript
// สำหรับกรณีวันที่ 1-31 และ "ของเดือน" แสดงเวลาถอยหลัง
const isMonthlyType = isDateRange || schedule.day_of_week.includes("ของเดือน");

if (isMonthlyType) {
  // ตรวจสอบว่ากำลังเปิดรับในวันนี้หรือไม่
  const currentDay = now.getDate();
  let isTodayOpenDay = false;
  let todayOpenTime: Date;
  let todayCloseTime: Date;
  
  if (isDateRange) {
    const dateNumbers = schedule.day_of_week.split(',').map(d => parseInt(d.trim(), 10)).filter(d => d >= 1 && d <= 31);
    isTodayOpenDay = dateNumbers.includes(currentDay);
  } else if (schedule.day_of_week.includes("ของเดือน")) {
    const match = schedule.day_of_week.match(/(\d+)(?:[,\s]+(\d+))?\s*ของเดือน/);
    let daysOfMonth: number[] = [];
    if (match) {
      daysOfMonth.push(parseInt(match[1], 10));
      if (match[2]) {
        daysOfMonth.push(parseInt(match[2], 10));
      }
    }
    isTodayOpenDay = daysOfMonth.includes(currentDay);
  }
  
  todayOpenTime = new Date(now.getFullYear(), now.getMonth(), currentDay, openH, openM, 0);
  todayCloseTime = new Date(now.getFullYear(), now.getMonth(), currentDay, closeH, closeM, 0);
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

### 3. ปรับปรุงการจัดการกรณีไม่มี targetTime

#### รองรับกรณี "ของเดือน":
```typescript
} else {
  // กรณีไม่มี targetTime (เช่น เลยวันที่ 31 แล้ว)
  const isMonthlyType = isDateRange || schedule.day_of_week.includes("ของเดือน");
  
  if (isMonthlyType) {
    const currentDay = now.getDate();
    let isTodayOpenDay = false;
    
    if (isDateRange) {
      const dateNumbers = schedule.day_of_week.split(',').map(d => parseInt(d.trim(), 10)).filter(d => d >= 1 && d <= 31);
      isTodayOpenDay = dateNumbers.includes(currentDay);
    } else if (schedule.day_of_week.includes("ของเดือน")) {
      const match = schedule.day_of_week.match(/(\d+)(?:[,\s]+(\d+))?\s*ของเดือน/);
      let daysOfMonth: number[] = [];
      if (match) {
        daysOfMonth.push(parseInt(match[1], 10));
        if (match[2]) {
          daysOfMonth.push(parseInt(match[2], 10));
        }
      }
      isTodayOpenDay = daysOfMonth.includes(currentDay);
    }
    
    if (isTodayOpenDay) {
      // วันนี้เป็นวันที่เปิดรับ แต่เลยเวลาแล้ว
      setDisplayText("ปิดรับแล้ว");
      setTextColor("text-red-500");
    } else {
      // วันนี้ไม่ใช่วันที่เปิดรับ
      setDisplayText("รอบถัดไป");
      setTextColor("text-blue-500");
    }
  } else {
    setDisplayText("ไม่พบวันเปิดรับถัดไป");
    setTextColor("text-orange-500");
  }
}
```

## ผลลัพธ์

1. **รองรับรูปแบบ "ของเดือน"**: "1, 31 ของเดือน", "1, 16 ของเดือน"
2. **การตรวจสอบวันที่เปิดรับ**: ตรวจสอบว่าวันนี้เป็นวันที่ 1 หรือ 31 หรือไม่
3. **การนับเวลาถอยหลัง**: เมื่อเป็นวันที่เปิดรับและกำลังเปิดรับ จะแสดงเวลาถอยหลังแบบละเอียด
4. **การจัดการกรณีต่างๆ**:
   - ยังไม่ถึงเวลาเปิดรับ → "เปิดรับใน"
   - กำลังเปิดรับ → "ปิดรับใน" พร้อมนับเวลาถอยหลัง
   - เลยเวลาเปิดรับแล้ว → หาวันถัดไป

## กรณีทดสอบเฉพาะ

### กรณีที่ 1: วันที่ 31 กำลังเปิดรับ
- **ข้อมูล**: "1, 31 ของเดือน", เปิดรับ 07:00, ปิดรับ 21:20
- **เวลาปัจจุบัน**: วันที่ 31 เวลา 15:30
- **ผลลัพธ์ที่คาดหวัง**: "ปิดรับใน 05:50:00" (นับเวลาถอยหลัง)

### กรณีที่ 2: วันที่ 31 เลยเวลาเปิดรับแล้ว
- **ข้อมูล**: "1, 31 ของเดือน", เปิดรับ 07:00, ปิดรับ 21:20
- **เวลาปัจจุบัน**: วันที่ 31 เวลา 22:00
- **ผลลัพธ์ที่คาดหวัง**: "รอบถัดไป 1 วัน" (นับไปวันที่ 1 เดือนถัดไป)

### กรณีที่ 3: วันที่ 15 (ไม่ใช่วันที่เปิดรับ)
- **ข้อมูล**: "1, 31 ของเดือน", เปิดรับ 07:00, ปิดรับ 21:20
- **เวลาปัจจุบัน**: วันที่ 15 เวลา 15:30
- **ผลลัพธ์ที่คาดหวัง**: "รอบถัดไป 16 วัน" (นับไปวันที่ 31 เดือนนี้)

## การแก้ไขปัญหาเดิม

- ✅ **แก้ไขปัญหา**: เมื่อเป็นวันที่เปิดรับ (เช่น วันที่ 31) ระบบจะนับเวลาถอยหลังแทนที่จะแสดง "เหลืออีก 1 วัน"
- ✅ **รองรับรูปแบบจริง**: "1, 31 ของเดือน" (รูปแบบ "ของเดือน")
- ✅ **การทำงานที่ถูกต้อง**: ตรวจสอบวันที่เปิดรับและแสดงผลตามสถานะเวลา 