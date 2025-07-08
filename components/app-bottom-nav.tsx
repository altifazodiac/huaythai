"use client"
import { useRouter, usePathname } from "next/navigation";
import { GalleryVerticalEnd, BookOpen, PieChart, Calendar, Frame, Sun, Moon, Ticket, Settings, ShieldUser } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "ผลหวย", url: "/", icon: Calendar },
  { title: "ตรวจผล", url: "/results", icon: BookOpen }, 
  { title: "ซื้อหวย", url: "/", icon: Ticket },
  { title: "สรุปรายงาน", url: "/summary", icon: PieChart },
  { title: "ช่วยเหลือ", url: "/ticket-purchases", icon: ShieldUser },

  
];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const CenterIcon = navItems[2].icon;
 

  return (
    <nav
    className="
      fixed bottom-0 left-0 right-0 z-[99999]
      bg-gradient-to-b from-red-600 to-red-900
      backdrop-blur-lg
      rounded-t-2xl
      shadow-2xl
      flex justify-between items-center
      h-16  
      px-2
      border-t border-red-500/30
    "
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      height: '64px'
    }}
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
      {/* ปุ่มกลาง */}
      <button
        onClick={() => router.push(navItems[2].url)}
        className="circle-us mt-[-20px]"
        style={{ zIndex: 2 }}
        aria-label={navItems[2].title}
      >
        <CenterIcon className="md:h-10 md:w-10 h-7 w-7 text-red-700 ml-4  md:ml-5" />
        <span className="md:text-sm text-xs font-bold text-red-700 ">{navItems[2].title}</span>
      </button>
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
       
      </div>
    </nav>
  );
} 