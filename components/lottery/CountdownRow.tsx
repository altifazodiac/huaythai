"use client";
import React, { useState, useEffect } from "react";

function getNextOpenClose(schedule: any) {
  if (!schedule) return { nextOpen: null, nextClose: null, isOpen: false };
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIdx = now.getDay();
  const days = schedule.day_of_week?.split(",").map((d: string) => d.trim()) || [];
  let openIdx = days.indexOf(dayNames[todayIdx]);
  let isOpen = false;
  let nextOpen: Date | null = null;
  let nextClose: Date | null = null;
  if (openIdx !== -1) {
    const [openH, openM] = schedule.open_time.split(":");
    const [closeH, closeM] = schedule.close_time.split(":");
    const open = new Date(now);
    open.setHours(+openH, +openM, 0, 0);
    const close = new Date(now);
    close.setHours(+closeH, +closeM, 0, 0);
    if (now < open) {
      nextOpen = open;
      nextClose = close;
      isOpen = false;
    } else if (now >= open && now <= close) {
      nextOpen = open;
      nextClose = close;
      isOpen = true;
    } else {
      isOpen = false;
    }
  }
  if (!isOpen && !nextOpen) {
    let minDiff = Infinity;
    let nextDayIdx = -1;
    for (let d of days) {
      const idx = dayNames.indexOf(d);
      let diff = idx - todayIdx;
      if (diff <= 0) diff += 7;
      if (diff < minDiff) {
        minDiff = diff;
        nextDayIdx = idx;
      }
    }
    if (nextDayIdx !== -1) {
      const next = new Date(now);
      next.setDate(now.getDate() + minDiff);
      const [openH, openM] = schedule.open_time.split(":");
      next.setHours(+openH, +openM, 0, 0);
      nextOpen = next;
      const nextClose = new Date(next);
      const [closeH, closeM] = schedule.close_time.split(":");
      nextClose.setHours(+closeH, +closeM, 0, 0);
      return { nextOpen, nextClose, isOpen: false };
    }
  }
  return { nextOpen, nextClose, isOpen };
}

export default function CountdownRow({ schedule }: { schedule: any }) {
  if (!schedule) {
    return <div className="text-xs text-red-500 text-center mt-1">ไม่มีข้อมูลตารางเวลา</div>;
  }
  if (schedule.day_of_week === "__MONTH_DAY__") {
    return <div className="text-xs font-semibold text-center mt-1 text-blue-600">ออกรางวัลตามวันที่ของเดือน</div>;
  }

  const [state, setState] = useState(() => ({
    nextOpen: null as Date | null,
    nextClose: null as Date | null,
    isOpen: false,
    now: new Date()
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const { nextOpen, nextClose, isOpen } = getNextOpenClose(schedule);
      setState(prev => ({
        ...prev,
        now,
        nextOpen,
        nextClose,
        isOpen
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule]);

  const { nextOpen, nextClose, isOpen, now } = state;
  let target = isOpen ? nextClose : nextOpen;
  let diff = target ? (target.getTime() - now.getTime()) : 0;
  let isNegative = diff < 0;
  if (isNegative) diff = 0;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (!target) return null;
  return (
    <div className={
      "text-xs font-semibold text-center mt-1 " +
      (isOpen ? "text-green-600" : "text-red-500")
    }>
      {isOpen
        ? `ปิดรับใน ${days ? days + " วัน " : ""}${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`
        : `รอเปิดรับ ${days ? days + " วัน " : ""}${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`}
    </div>
  );
} 