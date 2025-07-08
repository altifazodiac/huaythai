"use client"
import { useRouter, usePathname } from "next/navigation";
import { GalleryVerticalEnd, BookOpen, PieChart, Calendar, Frame, Sun, Moon, Ticket, Settings, ShieldUser, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";


const navItems = [
  { title: "ผลหวย", url: "/", icon: Calendar },
  { title: "ตรวจผล", url: "/results", icon: BookOpen }, 
  { title: "ซื้อหวย", url: "/", icon: Ticket },
  { title: "สรุปรายงาน", url: "/lottery-summary", icon: PieChart },
  { title: "ช่วยเหลือ", url: "/ticket-purchases", icon: ShieldUser },

  
];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const CenterIcon = navItems[2].icon;
  const { setTheme } = useTheme();

  return (
    <>
      {/* ปุ่มกลางที่ลอยอยู่ */}
      <button
        onClick={() => router.push(navItems[2].url)}
        className="floating-center-btn"
      >
        <CenterIcon className="h-6 w-6 text-white mb-0.5" />
        <span className="text-[10px] font-bold text-white leading-none">{navItems[2].title}</span>
      </button>

      {/* Bottom Navigation Bar with Notch */}
      <nav
      className={`
        navbarShape
        fixed bottom-0 left-0 right-0 z-[999]
        bg-gradient-to-b from-red-600 to-red-900
        flex justify-center items-center
        h-16 text-white text-lg
        shadow-2xl
      `}
    >
        {/* ซ้าย */}
        <div className="flex flex-1 justify-evenly">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.url}
              onClick={() => router.push(item.url)}
              className={
                `flex flex-col items-center justify-center flex-1
                text-white
                transition-all duration-200
                ${pathname === item.url ? "opacity-100 scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`
              }
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{item.title}</span>
            </button>
          ))}
        </div>

        {/* ช่องว่างสำหรับปุ่มกลาง */}
        <div className="flex-1 flex justify-center">
          {/* ช่องว่างสำหรับปุ่มกลางที่ลอยอยู่ */}
        </div>

        {/* ขวา */}
        <div className="flex flex-1 justify-evenly items-center">
          {navItems.slice(3).map((item) => (
            <button
              key={item.url}
              onClick={() => router.push(item.url)}
              className={
                `flex flex-col items-center justify-center flex-1
                text-white
                transition-all duration-200
                ${pathname === item.url ? "opacity-100 scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`
              }
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{item.title}</span>
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700/50">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
} 