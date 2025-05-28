// CountdownRow.tsx
"use client";
import React, { useState, useEffect } from "react";

interface ScheduleDetails {
  open_time: string;
  close_time: string;
  day_of_week: string; // คาดหวัง "Monday,Tuesday,..." หรือ "1, 16 ของเดือน"
  // หากมี 'days' (ที่เป็น array ตัวเลข) ก็สามารถใช้ได้ แต่จะ ưu tiên 'day_of_week' ที่เป็น string
  days?: number[];
}

interface CountdownRowProps {
  schedule: ScheduleDetails | null | undefined;
  isCurrentlyOpen: boolean;
}

export default function CountdownRow({ schedule, isCurrentlyOpen }: CountdownRowProps) {
  const [displayText, setDisplayText] = useState("");
  const [textColor, setTextColor] = useState("text-gray-500");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();

      if (!schedule || !schedule.open_time || !schedule.close_time || !schedule.day_of_week) {
        setDisplayText("ข้อมูลไม่ครบถ้วน");
        setTextColor("text-red-500");
        return;
      }

      const [openH, openM] = schedule.open_time.split(":").map(Number);
      const [closeH, closeM] = schedule.close_time.split(":").map(Number);
      const todayFull = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let targetTime: Date | null = null;
      let prefix: string = "";
      let color: string = "text-gray-600";

      if (schedule.day_of_week.includes("ของเดือน")) {
        // --- ตรรกะสำหรับรายการ "ของเดือน" ---
        prefix = "รอบถัดไป"; // หรือ "รอบถัดไป", "ออกรางวัล"
        color = "text-gray-500"; // หรือสีอื่นสำหรับหวยรัฐบาล

        const match = schedule.day_of_week.match(/(\d+)(?:[,\s]+(\d+))?\s*ของเดือน/);
        let daysOfMonth: number[] = [];
        if (match) {
          daysOfMonth.push(parseInt(match[1], 10));
          if (match[2]) {
            daysOfMonth.push(parseInt(match[2], 10));
          }
          daysOfMonth.sort((a, b) => a - b); // เรียงลำดับ เช่น [1, 16]
        }

        if (daysOfMonth.length > 0) {
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth(); // 0-11

          for (const d of daysOfMonth) {
            const candidate = new Date(currentYear, currentMonth, d, openH, openM, 0);
            if (now < candidate) {
              targetTime = candidate;
              break;
            }
          }

          if (!targetTime) { // ถ้าเลยวันของเดือนนี้ไปแล้ว ให้ไปที่วันแรกของเดือนถัดไป
            const firstDayForNextMonth = daysOfMonth[0];
            targetTime = new Date(currentYear, currentMonth + 1, firstDayForNextMonth, openH, openM, 0);
          }
        } else {
          // กรณี format "ของเดือน" ไม่ถูกต้อง
          setDisplayText("รูปแบบวันที่(เดือน)ไม่ถูกต้อง");
          setTextColor("text-orange-500");
          return;
        }
      } else if (isCurrentlyOpen) {
        // --- ตรรกะสำหรับรายการรายสัปดาห์ - เมื่อกำลังเปิดรับ ---
        prefix = "ปิดรับใน";
        color = "text-green-600";

        const openTimeOnToday = new Date(todayFull.getFullYear(), todayFull.getMonth(), todayFull.getDate(), openH, openM, 0);
        const closeTimeOnToday = new Date(todayFull.getFullYear(), todayFull.getMonth(), todayFull.getDate(), closeH, closeM, 0);

        if (openTimeOnToday < closeTimeOnToday) { // เปิดและปิดในวันเดียวกัน
          targetTime = closeTimeOnToday;
        } else { // เปิดและปิดข้ามคืน
          if (now < closeTimeOnToday) {
            targetTime = closeTimeOnToday;
          } else {
            const tomorrowFull = new Date(todayFull);
            tomorrowFull.setDate(todayFull.getDate() + 1);
            targetTime = new Date(tomorrowFull.getFullYear(), tomorrowFull.getMonth(), tomorrowFull.getDate(), closeH, closeM, 0);
          }
        }
      } else {
        // --- ตรรกะสำหรับรายการรายสัปดาห์ - เมื่อกำลังปิดรับ ---
        prefix = "รอบถัดไป";
        color = "text-gray-600";

        const dayMap: { [key: string]: number } = { "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6 };
        const englishDayNames = schedule.day_of_week.toLowerCase().split(',').map(d => d.trim());
        const openDaysNumbers = englishDayNames.map(name => dayMap[name]).filter(dayNum => dayNum !== undefined && dayNum !== null);

        if (openDaysNumbers.length === 0) {
          setDisplayText("ไม่พบวันเปิดทำการ");
          setTextColor("text-orange-500");
          return;
        }

        for (let i = 0; i < 14; i++) { // ตรวจสอบไปข้างหน้า 14 วัน
          const potentialOpenDate = new Date(now);
          potentialOpenDate.setDate(now.getDate() + i);
          potentialOpenDate.setHours(openH, openM, 0, 0);

          const dayIdx = potentialOpenDate.getDay();

          if (openDaysNumbers.includes(dayIdx) && potentialOpenDate > now) {
            targetTime = potentialOpenDate;
            break;
          }
        }
      }

      // --- ส่วนคำนวณและแสดงผลเวลานับถอยหลัง (ใช้ร่วมกัน) ---
      if (targetTime) {
        const diff = Math.max(0, Math.floor((targetTime.getTime() - now.getTime()) / 1000));
        const d = Math.floor(diff / (60 * 60 * 24)); // แก้ไขการหารเป็น 60*60*24
        const h = Math.floor((diff % (60 * 60 * 24)) / (60 * 60)); // แก้ไขการหาร
        const m = Math.floor((diff % (60 * 60)) / 60); // แก้ไขการหาร
        const s = Math.floor(diff % 60);


        let timeParts = [];
        if (d > 0) {
          timeParts.push(`${d} วัน`);
        }

        const totalHours = d * 24 + h;
        if (totalHours > 0) {
          timeParts.push(`${(d > 0) ? String(h).padStart(2, '0') : h} :`);
        } else if (d > 0) {
          timeParts.push(`0 ชม.`);
        }
        
        // แสดงนาทีและวินาทีเสมอ หากยังไม่หมดเวลาจริงๆ หรือ targetTime ยังเป็นอนาคต
        if (diff > 0 || (targetTime > now)) {
            timeParts.push(`${String(m).padStart(2, '0')} :`);
            timeParts.push(`${String(s).padStart(2, '0')} น.`);
        }


        if (diff === 0 && targetTime <= now) {
          let endText = isCurrentlyOpen ? "ปิดรับแล้ว" : "ถึงเวลาเปิดรับ";
          if (schedule.day_of_week.includes("ของเดือน") && !isCurrentlyOpen) {
            endText = "ถึงรอบประกาศผล"; // หรือข้อความที่เหมาะสม
          }
          setDisplayText(endText);
        } else if (timeParts.length > 0) {
          setDisplayText(`${prefix} ${timeParts.join(" ")}`);
        } else if (diff === 0) { // กรณี 0 วินาที พอดี
           setDisplayText(`${prefix} 0 วินาที`);
        }
         else { // กรณีอื่นๆ ที่ targetTime อาจจะ null หรือคำนวณไม่ได้
          setDisplayText(prefix); // แสดงแค่ prefix เช่น "รอเปิดรับ"
        }

      } else {
        // ไม่พบ targetTime (เช่น ไม่พบวันเปิดรับถัดไปสำหรับรายการรายสัปดาห์ หรือ "ของเดือน" ผิดพลาด)
        setDisplayText("ไม่พบวันเปิดรับถัดไป"); // ข้อความนี้จะถูกแสดงถ้า targetTime เป็น null
      }
      setTextColor(color);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [schedule, isCurrentlyOpen]);


  if (!schedule || !schedule.open_time || !schedule.close_time || !schedule.day_of_week ) {
    return <div className="text-xs text-gray-500 text-center mt-1">รอข้อมูล...</div>;
  }
  // การแสดงผลพิเศษสำหรับ "__MONTH_DAY__" หากยังต้องการ แต่ตอนนี้เราใช้ includes("ของเดือน") แทน
  // if (schedule.day_of_week === "__MONTH_DAY__") {
  //     return <div className="text-xs font-semibold text-center mt-1 text-blue-600">ออกรางวัลตามวันที่ของเดือน</div>;
  // }

  return (
    <div className="bg-gray-100 rounded-xl">
      <div className={`text-xs text-center mt-1 ${textColor}`}>
      {displayText}
    </div>
     </div>
  );
}