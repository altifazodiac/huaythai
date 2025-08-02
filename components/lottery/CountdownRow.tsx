// CountdownRow.tsx
"use client";
import React, { useState, useEffect } from "react";

interface ScheduleDetails {
  open_time: string;
  close_time: string;
  day_of_week: string; // คาดหวัง "Monday,Tuesday,..." หรือ "1, 16 ของเดือน" หรือ "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31"
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

      // Debug: ตรวจสอบข้อมูลที่ส่งเข้ามา
      console.log("CountdownRow Debug:", {
        day_of_week: schedule.day_of_week,
        open_time: schedule.open_time,
        close_time: schedule.close_time,
        isCurrentlyOpen,
        currentDate: now.toISOString()
      });

      const [openH, openM] = schedule.open_time.split(":").map(Number);
      const [closeH, closeM] = schedule.close_time.split(":").map(Number);
      const todayFull = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let targetTime: Date | null = null;
      let prefix: string = "";
      let color: string = "text-gray-600";

      // ตรวจสอบว่าเป็นรูปแบบวันที่ 1-31 หรือไม่
      const isDateRange = /^\d+(?:,\s*\d+)*$/.test(schedule.day_of_week.trim());
      
      if (isDateRange) {
        // --- ตรรกะสำหรับรายการวันที่ 1-31 ---
        const dateNumbers = schedule.day_of_week.split(',').map(d => parseInt(d.trim(), 10)).filter(d => d >= 1 && d <= 31);
        
        if (dateNumbers.length === 0) {
          setDisplayText("รูปแบบวันที่ไม่ถูกต้อง");
          setTextColor("text-orange-500");
          return;
        }

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

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
            let nextDate = null;
            for (const day of dateNumbers.sort((a, b) => a - b)) {
              if (day > currentDay) {
                const candidate = new Date(currentYear, currentMonth, day, openH, openM, 0);
                if (candidate > now) {
                  nextDate = candidate;
                  break;
                }
              }
            }
            
            // ถ้าไม่มีวันที่ถัดไปในเดือนนี้ ให้ไปเดือนถัดไป
            if (!nextDate) {
              const nextMonth = currentMonth + 1;
              const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
              const nextMonthAdjusted = nextMonth > 11 ? 0 : nextMonth;
              
              for (const day of dateNumbers.sort((a, b) => a - b)) {
                const candidate = new Date(nextYear, nextMonthAdjusted, day, openH, openM, 0);
                if (candidate > now) {
                  nextDate = candidate;
                  break;
                }
              }
            }
            targetTime = nextDate;
            prefix = "รอบถัดไป";
            color = "text-red-600";
          }
        } else {
          // วันนี้ไม่ใช่วันที่เปิดรับ หาวันถัดไป
          let nextDate = null;
          for (const day of dateNumbers.sort((a, b) => a - b)) {
            if (day > currentDay) {
              const candidate = new Date(currentYear, currentMonth, day, openH, openM, 0);
              if (candidate > now) {
                nextDate = candidate;
                break;
              }
            }
          }
          
          // ถ้าไม่มีวันที่ถัดไปในเดือนนี้ ให้ไปเดือนถัดไป
          if (!nextDate) {
            const nextMonth = currentMonth + 1;
            const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
            const nextMonthAdjusted = nextMonth > 11 ? 0 : nextMonth;
            
            for (const day of dateNumbers.sort((a, b) => a - b)) {
              const candidate = new Date(nextYear, nextMonthAdjusted, day, openH, openM, 0);
              if (candidate > now) {
                nextDate = candidate;
                break;
              }
            }
          }
          targetTime = nextDate;
          prefix = "รอบถัดไป";
          color = "text-red-600";
        }
      } else if (schedule.day_of_week.includes("ของเดือน")) {
        // --- ตรรกะสำหรับรายการ "ของเดือน" ---
        console.log("Processing ของเดือน:", schedule.day_of_week);
        const match = schedule.day_of_week.match(/(\d+)(?:[,\s]+(\d+))?\s*ของเดือน/);
        let daysOfMonth: number[] = [];
        if (match) {
          daysOfMonth.push(parseInt(match[1], 10));
          if (match[2]) {
            daysOfMonth.push(parseInt(match[2], 10));
          }
          daysOfMonth.sort((a, b) => a - b);
        }
        console.log("Days of month:", daysOfMonth);

        if (daysOfMonth.length > 0) {
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          const currentDay = now.getDate();

          // ตรวจสอบว่าวันนี้เป็นวันที่เปิดรับหรือไม่
          const isTodayOpenDay = daysOfMonth.includes(currentDay);
          console.log("Current day:", currentDay, "Is today open day:", isTodayOpenDay);
          
          if (isTodayOpenDay) {
            // วันนี้เป็นวันที่เปิดรับ
            const todayOpenTime = new Date(currentYear, currentMonth, currentDay, openH, openM, 0);
            const todayCloseTime = new Date(currentYear, currentMonth, currentDay, closeH, closeM, 0);
            
            if (now < todayOpenTime) {
              // ยังไม่ถึงเวลาเปิดรับ
              console.log("Before open time");
              targetTime = todayOpenTime;
              prefix = "เปิดรับใน";
              color = "text-yellow-300";
            } else if (now >= todayOpenTime && now < todayCloseTime) {
              // กำลังเปิดรับ
              console.log("Currently open");
              targetTime = todayCloseTime;
              prefix = "ปิดรับใน";
              color = "text-yellow-300";
            } else {
              console.log("After close time");
              // เลยเวลาเปิดรับแล้ว หาวันถัดไป
              let nextDate = null;
              for (const day of daysOfMonth) {
                if (day > currentDay) {
                  const candidate = new Date(currentYear, currentMonth, day, openH, openM, 0);
                  if (candidate > now) {
                    nextDate = candidate;
                    break;
                  }
                }
              }
              
              // ถ้าไม่มีวันที่ถัดไปในเดือนนี้ ให้ไปเดือนถัดไป
              if (!nextDate) {
                const nextMonth = currentMonth + 1;
                const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
                const nextMonthAdjusted = nextMonth > 11 ? 0 : nextMonth;
                
                for (const day of daysOfMonth) {
                  const candidate = new Date(nextYear, nextMonthAdjusted, day, openH, openM, 0);
                  if (candidate > now) {
                    nextDate = candidate;
                    break;
                  }
                }
              }
              targetTime = nextDate;
              prefix = "รอบถัดไป";
              color = "text-red-600";
            }
          } else {
            // วันนี้ไม่ใช่วันที่เปิดรับ หาวันถัดไป
            let nextDate = null;
            for (const day of daysOfMonth) {
              if (day > currentDay) {
                const candidate = new Date(currentYear, currentMonth, day, openH, openM, 0);
                if (candidate > now) {
                  nextDate = candidate;
                  break;
                }
              }
            }
            
            // ถ้าไม่มีวันที่ถัดไปในเดือนนี้ ให้ไปเดือนถัดไป
            if (!nextDate) {
              const nextMonth = currentMonth + 1;
              const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
              const nextMonthAdjusted = nextMonth > 11 ? 0 : nextMonth;
              
              for (const day of daysOfMonth) {
                const candidate = new Date(nextYear, nextMonthAdjusted, day, openH, openM, 0);
                if (candidate > now) {
                  nextDate = candidate;
                  break;
                }
              }
            }
            targetTime = nextDate;
            prefix = "รอบถัดไป";
            color = "text-red-600";
          }
        } else {
          setDisplayText("รูปแบบวันที่(เดือน)ไม่ถูกต้อง");
          setTextColor("text-orange-500");
          return;
        }
      } else if (isCurrentlyOpen) {
        // --- ตรรกะสำหรับรายการรายสัปดาห์ - เมื่อกำลังเปิดรับ ---
        prefix = "ปิดรับใน";
        color = "text-yellow-300";

        const openTimeOnToday = new Date(todayFull.getFullYear(), todayFull.getMonth(), todayFull.getDate(), openH, openM, 0);
        const closeTimeOnToday = new Date(todayFull.getFullYear(), todayFull.getMonth(), todayFull.getDate(), closeH, closeM, 0);

        if (openTimeOnToday < closeTimeOnToday) {
          targetTime = closeTimeOnToday;
        } else {
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
        color = "text-red-400";

        const dayMap: { [key: string]: number } = { "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6 };
        const englishDayNames = schedule.day_of_week.toLowerCase().split(',').map(d => d.trim());
        const openDaysNumbers = englishDayNames.map(name => dayMap[name]).filter(dayNum => dayNum !== undefined && dayNum !== null);

        if (openDaysNumbers.length === 0) {
          setDisplayText("ไม่พบวันเปิดทำการ");
          setTextColor("text-orange-500");
          return;
        }

        for (let i = 0; i < 14; i++) {
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
      const isMonthlyType = isDateRange || schedule.day_of_week.includes("ของเดือน");
      
      if (targetTime) {
        const diff = Math.max(0, Math.floor((targetTime.getTime() - now.getTime()) / 1000));
        const d = Math.floor(diff / (60 * 60 * 24));
        const h = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
        const m = Math.floor((diff % (60 * 60)) / 60);
        const s = Math.floor(diff % 60);

        let timeParts = [];
        
        // สำหรับกรณีวันที่ 1-31 และ "ของเดือน" แสดงเวลาถอยหลัง
        
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
        } else {
          // สำหรับกรณีอื่นๆ แสดงแบบเดิม
          if (d > 0) {
            timeParts.push(`${d} วัน`);
          }

          const totalHours = d * 24 + h;
          if (totalHours > 0) {
            timeParts.push(`${(d > 0) ? String(h).padStart(2, '0') : h} :`);
          } else if (d > 0) {
            timeParts.push(`0 ชม.`);
          }
          
          if (diff > 0 || (targetTime > now)) {
            timeParts.push(`${String(m).padStart(2, '0')} :`);
            timeParts.push(`${String(s).padStart(2, '0')} น.`);
          }
        }

        if (diff === 0 && targetTime <= now) {
          let endText = isCurrentlyOpen ? "ปิดรับแล้ว" : "ถึงเวลาเปิดรับ";
          if ((schedule.day_of_week.includes("ของเดือน") || isDateRange) && !isCurrentlyOpen) {
            endText = "ถึงรอบประกาศผล";
          }
          setDisplayText(endText);
        } else if (timeParts.length > 0) {
          setDisplayText(`${prefix} ${timeParts.join(" ")}`);
        } else if (diff === 0) {
          setDisplayText(`${prefix} 0 วินาที`);
        } else {
          setDisplayText(prefix);
        }

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
            setTextColor("text-red-600");
          }
        } else {
          setDisplayText("ไม่พบวันเปิดรับถัดไป");
          setTextColor("text-orange-500");
        }
      }
      // ตั้งค่า textColor ตามที่กำหนดไว้ในแต่ละกรณี
      if (isMonthlyType && !targetTime) {
        // textColor ถูกตั้งค่าแล้วในกรณี isMonthlyType
      } else {
        setTextColor(color);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [schedule, isCurrentlyOpen]);

  if (!schedule || !schedule.open_time || !schedule.close_time || !schedule.day_of_week ) {
    return <div className="text-xs text-gray-500 text-center mt-1">รอข้อมูล...</div>;
  }

  return (
    <div className="">
      <div className={`text-xs text-center mt-1 ${textColor}`}>
        {displayText}
      </div>
    </div>
  );
}