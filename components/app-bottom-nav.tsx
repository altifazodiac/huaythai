"use client"
import { useRouter, usePathname } from "next/navigation";
import { GalleryVerticalEnd, BookOpen, PieChart, Calendar, Frame, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "หวย", url: "/", icon: GalleryVerticalEnd },
  { title: "ซื้อ", url: "/ticket-purchases", icon: BookOpen },
  { title: "ตรวจผล", url: "/lottery-ticketresults", icon: PieChart }, // ปุ่มกลาง
  { title: "ผลล่าสุด", url: "/lottery-results", icon: Calendar },
  { title: "สรุป", url: "/lottery-summary", icon: Frame },
];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const CenterIcon = navItems[2].icon;
  const { setTheme } = useTheme();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-gradient-to-b from-red-600 to-red-900
        opacity-95
        backdrop-blur-lg
        rounded-t-2xl
        shadow-2xl
        flex justify-between items-center
        h-16
        px-2
        transition-all
        md:rounded-b-none
        md:rounded-t-2xl
        md:border-x md:border-red-700/30
        md:bottom-0
        md:left-1/2 md:-translate-x-1/2
        md:w-full
      "
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
        className="circle-us"
        style={{ zIndex: 2 }}
        aria-label={navItems[2].title}
      >
        <CenterIcon className="h-7 w-7 mb-1 text-red-600" />
        <span className="text-xs font-bold text-red-600">{navItems[2].title}</span>
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
        {/* Theme toggle button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:text-white dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 data-[state=open]:bg-red-100 dark:data-[state=open]:bg-red-700">
              <Sun className="h-5 w-5 rotate-0 scale-100 text-white transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-white transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[130px] z-[9999] bg-red-900 text-slate-100 border-red-700/70 shadow-xl">
            <DropdownMenuItem onClick={() => setTheme("light")}
              className="cursor-pointer flex items-center text-red-700 gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <Sun className="h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <Moon className="h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}
              className="cursor-pointer flex items-center text-red-700 gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
} 