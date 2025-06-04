"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetFooter, SheetDescription } from "@/components/ui/sheet"; // เพิ่ม SheetHeader, SheetFooter, SheetDescription
import { Separator } from "@/components/ui/separator"; // เพิ่ม Separator
import { Filter, CheckCircle, Circle, XCircle, Globe } from "lucide-react"; // เพิ่มไอคอน (ตัวอย่าง)
import { countryFlagImg } from "@/lib/utils/flags"; // เพิ่ม import สำหรับ flag
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

// dayOfWeekTH and dayOfWeekToEn functions remain the same

export default function FilterBar({ countries, onFilterChange }: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState<null | boolean>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false); // ควบคุมการเปิด/ปิด Sheet

  function handleFilterOpenChange(val: null | boolean) {
    setFilterOpen(val);
    onFilterChange?.({ filterOpen: val, filterCountry });
  }

  function handleFilterCountryChange(val: string) {
    setFilterCountry(val);
    onFilterChange?.({ filterOpen, filterCountry: val });
  }

  const statusFilters = [
    { label: "ทั้งหมด", value: null, icon: <Circle className="mr-2 h-4 w-4" /> },
    { label: "เปิดรับ", value: true, icon: <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> },
    { label: "ปิดรับ", value: false, icon: <XCircle className="mr-2 h-4 w-4 text-red-500" /> },
  ];

  const countryFiltersList = [
    { label: "ทุกประเทศ", value: "all" },
    ...countries.map(code => ({ label: countryLabel[code] || code, value: code })),
  ];

  // Component สำหรับปุ่ม Filter แต่ละปุ่ม (เพื่อให้โค้ดไม่ซ้ำซ้อน)
  const FilterButton = ({ label, value, isActive, onClick, icon, flag }: { label: string, value: any, isActive: boolean, onClick: () => void, icon?: React.ReactNode, flag?: React.ReactNode }) => (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className={`rounded-full ${isActive ? "font-semibold" : ""} transition-all duration-150 ease-in-out`}
      onClick={onClick}
    >
      {flag}
      {icon}
      {label}
    </Button>
  );

  // ส่วนของ Filter buttons ที่จะใช้ทั้ง Desktop และ Mobile Sheet
  const filterControls = (
    <div className="flex flex-wrap gap-1 sm:gap-2 items-center w-full backdrop-blur-sm rounded-lg px-2 py-2 shadow-sm ml-4">
      {/* Status Filters */}
      <div className="flex flex-row flex-wrap gap-1 items-center">
        <span className="text-xs font-medium text-muted-foreground mr-2">สถานะ:</span>
        <Tabs value={filterOpen === null ? "all" : filterOpen ? "open" : "close"} onValueChange={val => handleFilterOpenChange(val === "all" ? null : val === "open")}
          className="w-full">
          <TabsList className="flex gap-1 bg-transparent p-0">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="open">เปิดรับ</TabsTrigger>
            <TabsTrigger value="close">ปิดรับ</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {/* Country Filters */}
      <div className="flex flex-col w-full sm:w-auto h-full">
        <span className="text-xs font-medium text-muted-foreground mb-1">ประเทศ:</span>
        <Tabs value={filterCountry} onValueChange={handleFilterCountryChange} className="w-full">
          <TabsList
            className="flex flex-wrap gap-1 bg-transparent p-0 justify-center w-full"
            style={{ marginTop: 0, marginBottom: 0 }}
          >
            {countryFiltersList.map(c => (
              <TabsTrigger
                key={c.value}
                value={c.value}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  data-[state=active]:bg-secondary data-[state=active]:text-primary
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
                  transition-all"
                style={{ minWidth: 70 }}
              >
                {c.value === "all"
                  ? <Globe className="h-4 w-4 text-blue-400" />
                  : <img src={countryFlagImg(countryLabel[c.value] || c.value)} alt={c.label} className="h-4 w-4 rounded-full object-cover" />
                }
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="mb-6 mt-2 px-4 sm:px-0"> {/* เพิ่ม mt-2 และปรับ px */}
      {/* Desktop: แสดงปุ่ม filter ปกติ */}
      <div className="hidden sm:flex sm:flex-col sm:gap-4">{filterControls}</div>

      {/* Mobile: แสดงปุ่มเดียว เปิด Sheet */}
      <div className="flex sm:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 py-3 text-base">
              <Filter className="w-5 h-5" />
              ค้นหา ({filterOpen !== null ? (filterOpen ? "เปิดรับ" : "ปิดรับ") : "ทั้งหมด"} / {filterCountry === "all" ? "ทุกประเทศ" : (countryLabel[filterCountry] || filterCountry)})
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-lg px-4 hoverflow-y-auto">
            <SheetHeader className="">
              <SheetTitle className="text-center text-xl">ตัวกรองข้อมูล</SheetTitle>
              <SheetDescription className="text-center">
                เลือกสถานะและประเทศที่ต้องการแสดง
              </SheetDescription>
            </SheetHeader>
            <div className="">
              {filterControls}
            </div>
            <SheetFooter className="mt-12">
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