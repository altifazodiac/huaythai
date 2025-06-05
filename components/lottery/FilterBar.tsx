"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Filter, Globe } from "lucide-react";
import { countryFlagImg } from "@/lib/utils/flags";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FilterBarProps {
  countries: string[];
  onFilterChange?: (filters: { filterOpen: null | boolean; filterCountry: string }) => void;
}

const countryLabel: Record<string, string> = {
  TH: "หวยไทย",
  LA: "หวยลาว",
  VN: "หวยเวียดนาม",
  // เพิ่มประเทศอื่นๆ ตามต้องการ
};

export default function FilterBar({ countries, onFilterChange }: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState<null | boolean>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  function handleFilterOpenChange(val: string) {
    const newStatus = val === "all" ? null : val === "open";
    setFilterOpen(newStatus);
    onFilterChange?.({ filterOpen: newStatus, filterCountry });
  }

  function handleFilterCountryChange(val: string) {
    setFilterCountry(val);
    onFilterChange?.({ filterOpen, filterCountry: val });
  }

  const countryFiltersList = [
    { label: "ทุกประเทศ", value: "all" },
    ...countries.map(code => ({ label: countryLabel[code] || code, value: code })),
  ];

  // แยกส่วนของ Filter UI ออกมาเพื่อให้เรียกใช้ได้สะดวกและไม่ซ้ำซ้อน
  // โดยไม่มี container div ที่มี layout ที่ขัดแย้งกัน
  const filterSections = (
    <>
      {/* Status Filters */}
      <div className="flex flex-col items-start gap-2">
        <span className="text-sm font-medium text-muted-foreground">สถานะ</span>
        <Tabs
          value={filterOpen === null ? "all" : filterOpen ? "open" : "close"}
          onValueChange={handleFilterOpenChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="open">เปิดรับ</TabsTrigger>
            <TabsTrigger value="close">ปิดรับ</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Country Filters */}
      <div className="flex flex-col items-start gap-2">
        <span className="text-sm font-medium text-muted-foreground">ประเทศ</span>
        <Tabs value={filterCountry} onValueChange={handleFilterCountryChange} className="w-full">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {countryFiltersList.map(c => (
              <TabsTrigger
                key={c.value}
                value={c.value}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              >
                {c.value === "all"
                  ? <Globe className="h-4 w-4" />
                  : <img src={countryFlagImg(c.value)} alt={c.label} className="h-4 w-4 rounded-full object-cover" />
                }
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </>
  );

  return (
    <div className="mb-6 mt-2 px-4">
      {/* --- Desktop View --- */}
      {/* สำหรับจอใหญ่ (sm ขึ้นไป) จะแสดง Filter เป็นแนวนอน */}
      <div className="hidden sm:flex flex-row items-end gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        {filterSections}
      </div>

      {/* --- Mobile View --- */}
      {/* สำหรับจอมือถือ จะแสดงเป็นปุ่มเพื่อเปิด Sheet */}
      <div className="flex sm:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 py-3 text-base">
              <Filter className="w-5 h-5" />
              ตัวกรอง ({filterCountry === "all" ? "ทุกประเทศ" : (countryLabel[filterCountry] || filterCountry)})
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-lg overflow-y-auto">
            <SheetHeader className="text-center">
              <SheetTitle className="text-xl">ตัวกรองข้อมูล</SheetTitle>
              <SheetDescription>
                เลือกสถานะและประเทศที่ต้องการแสดง
              </SheetDescription>
            </SheetHeader>
            {/* Layout สำหรับ Filter ใน Sheet (จัดเรียงแนวตั้ง) */}
            <div className="flex flex-col gap-6 py-6">
              {filterSections}
            </div>
            <SheetFooter>
              <Button className="w-full py-3 text-base" onClick={() => setIsSheetOpen(false)}>
                แสดงผล
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}