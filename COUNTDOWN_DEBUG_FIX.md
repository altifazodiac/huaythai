# การแก้ไขและ Debug ปัญหาการนับถอยหลัง

## ปัญหาที่พบ

จากรูปภาพยังคงแสดง **"เหลืออีก 1 วัน"** แทนที่จะนับเวลาถอยหลัง แม้ว่าเราได้แก้ไขโค้ดแล้ว

## การวิเคราะห์ปัญหา

### 1. ตรวจสอบข้อมูลที่ส่งเข้ามา
เพิ่ม debug log เพื่อตรวจสอบข้อมูล:
```typescript
// Debug: ตรวจสอบข้อมูลที่ส่งเข้ามา
console.log("CountdownRow Debug:", {
  day_of_week: schedule.day_of_week,
  open_time: schedule.open_time,
  close_time: schedule.close_time,
  isCurrentlyOpen,
  currentDate: now.toISOString()
});
```

### 2. ตรวจสอบการประมวลผลกรณี "ของเดือน"
```typescript
console.log("Processing ของเดือน:", schedule.day_of_week);
console.log("Days of month:", daysOfMonth);
console.log("Current day:", currentDay, "Is today open day:", isTodayOpenDay);
```

### 3. ตรวจสอบสถานะเวลา
```typescript
if (now < todayOpenTime) {
  console.log("Before open time");
} else if (now >= todayOpenTime && now < todayCloseTime) {
  console.log("Currently open");
} else {
  console.log("After close time");
}
```

## การแก้ไขที่ทำ

### 1. แก้ไข LotteryTypeGrid.tsx
เปลี่ยนจากการใช้ `getSpecialCountdown` เป็นการใช้ `CountdownRow` สำหรับกรณี "ของเดือน":

```typescript
{!isMonthlyDraw(schedule)
  ? <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />
  : (
    (() => {
      const today = new Date();
      const isDateRange = /^\d+(?:,\s*\d+)*$/.test(schedule.day_of_week?.trim() || '');
      const isMonthlyType = schedule.day_of_week?.includes("ของเดือน");

      if (isDateRange || isMonthlyType) {
        // กรณีวันที่ 1-31 หรือ "ของเดือน" ใช้ CountdownRow ใหม่
        return <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />;
      } else {
        // กรณีอื่นๆ ใช้ getSpecialCountdown
        return <div className="text-xs text-red-500">เหลืออีก {getSpecialCountdown(schedule, today)}</div>;
      }
    })()
  )
}
```

### 2. ปรับปรุง CountdownRow.tsx
เพิ่มตรรกะการตรวจสอบวันที่เปิดรับสำหรับกรณี "ของเดือน":

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

## ขั้นตอนการ Debug

### 1. เปิด Developer Console
เปิด Developer Console ในเบราว์เซอร์เพื่อดู debug log

### 2. ตรวจสอบข้อมูล
ดูว่า `day_of_week` เป็น "1, 31 ของเดือน" หรือไม่

### 3. ตรวจสอบการประมวลผล
ดูว่า:
- `Days of month: [1, 31]` หรือไม่
- `Current day: 31` และ `Is today open day: true` หรือไม่
- `Currently open` หรือ `Before open time` หรือ `After close time`

### 4. ตรวจสอบผลลัพธ์
ดูว่า `targetTime` ถูกตั้งค่าหรือไม่ และการแสดงผลเป็นอย่างไร

## สาเหตุที่เป็นไปได้

1. **ข้อมูลไม่ถูกต้อง**: `day_of_week` อาจไม่ใช่ "1, 31 ของเดือน"
2. **วันที่ไม่ตรง**: วันปัจจุบันอาจไม่ใช่วันที่ 31
3. **เวลาไม่ตรง**: เวลาปัจจุบันอาจอยู่นอกช่วงเปิดรับ
4. **การแสดงผล**: อาจมีปัญหาการแสดงผลในส่วนอื่น

## การแก้ไขเพิ่มเติม

หากยังมีปัญหา ให้ตรวจสอบ:
1. ข้อมูลในฐานข้อมูล
2. การแปลงข้อมูลใน `dayOfWeekToEn`
3. การส่งข้อมูลไปยัง `CountdownRow`
4. การแสดงผลในส่วนอื่นของโค้ด

## ผลลัพธ์ที่คาดหวัง

เมื่อแก้ไขแล้ว ควรจะเห็น:
- **เมื่อเป็นวันที่ 31 และกำลังเปิดรับ**: "ปิดรับใน 05:50:00" (นับเวลาถอยหลัง)
- **เมื่อเป็นวันที่ 31 แต่เลยเวลาแล้ว**: "รอบถัดไป 1 วัน"
- **เมื่อไม่ใช่วันที่เปิดรับ**: "รอบถัดไป X วัน" 