"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

interface FilterBarProps {
  countries: string[];
  onFilterChange?: (filters: { filterOpen: null | boolean; filterCountry: string }) => void;
}

const countryLabel: Record<string, string> = {
  TH: "หวยไทย",
  LA: "หวยลาว",
  VN: "หวยเวียดนาม",
};

function dayOfWeekTH(days: string) {
  if (!days) return "";
  const arr = days.split(",").map(d => d.trim());
  if (arr.length === 5 && arr[0] === "Monday" && arr[4] === "Friday") return "จันทร์-ศุกร์";
  if (arr.length === 7) return "ทุกวัน";
  const map: Record<string, string> = {
    Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัส", Friday: "ศุกร์", Saturday: "เสาร์", Sunday: "อาทิตย์"
  };
  return arr.map(d => map[d] || d).join(", ");
}

function dayOfWeekToEn(day: string) {
  const map: Record<string, string> = {
    "จันทร์": "Monday",
    "อังคาร": "Tuesday",
    "พุธ": "Wednesday",
    "พฤหัสบดี": "Thursday",
    "ศุกร์": "Friday",
    "เสาร์": "Saturday",
    "อาทิตย์": "Sunday",
    "ทุกวัน": "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
  };
  day = day.replace(/วัน/g, "").trim();
  if (day === "ทุกวัน") return map["ทุกวัน"];
  const dashMatch = day.match(/^([ก-๙]+)[–—-]([ก-๙]+)$/);
  if (dashMatch) {
    const daysOrder = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
    const start = daysOrder.indexOf(dashMatch[1]);
    const end = daysOrder.indexOf(dashMatch[2]);
    if (start !== -1 && end !== -1) {
      let arr = [];
      if (start <= end) {
        arr = daysOrder.slice(start, end + 1);
      } else {
        arr = daysOrder.slice(start).concat(daysOrder.slice(0, end + 1));
      }
      return arr.map(d => map[d]).join(",");
    }
  }
  if (day.match(/ของเดือน/)) return "__MONTH_DAY__";
  return day.split(",").map(d => map[d.trim()] || d.trim()).join(",");
}

export default function FilterBar({ countries, onFilterChange }: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState<null | boolean>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [open, setOpen] = useState(false);

  function handleFilterOpen(val: null | boolean) {
    setFilterOpen(val);
    onFilterChange?.({ filterOpen: val, filterCountry });
  }
  function handleFilterCountry(val: string) {
    setFilterCountry(val);
    onFilterChange?.({ filterOpen, filterCountry: val });
  }

  // ปุ่ม filter ทั้งหมด
  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      <Button  className="border border-blue-800"
        variant={filterOpen === null ? "default" : "outline"}
        onClick={() => handleFilterOpen(null)}
      >ทั้งหมด</Button>
      <Button  className="border border-blue-800"
        variant={filterOpen === true ? "default" : "outline"}
        onClick={() => handleFilterOpen(true)}
      >เปิดรับ</Button>
      <Button  className="border border-blue-800"
        variant={filterOpen === false ? "default" : "outline"}
        onClick={() => handleFilterOpen(false)}
      >ปิดรับ</Button>
      <div className="w-px h-6 bg-gray-300 mx-2" />
      <Button  className="border border-blue-800"
        variant={filterCountry === "all" ? "default" : "outline"}
        onClick={() => handleFilterCountry("all")}
      >ทุกประเทศ</Button>
      {countries.map(code => (
        <Button
          className="border border-blue-800"
          key={code}
          variant={filterCountry === code ? "default" : "outline"}
          onClick={() => handleFilterCountry(code)}
        >{countryLabel[code] || code}</Button>
      ))}
    </div>
  );

  return (
    <div className="mb-4 ml-4">
      {/* Desktop: แสดงปุ่ม filter ปกติ */}
      <div className="hidden sm:flex">{filterButtons}</div>
      {/* Mobile: แสดงปุ่มเดียว เปิด Drawer */}
      <div className="flex sm:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full flex items-center gap-2">
              <Filter className="w-4 h-4" />
              ตัวกรอง
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="space-y-4">
            <SheetTitle>ตัวกรอง</SheetTitle>
            {filterButtons}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
} 