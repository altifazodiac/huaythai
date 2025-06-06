"use client"

import React, { useState } from "react"
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Ticket,
  Trash,
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

// หมายเหตุ: แนะนำให้สร้าง Overlay ใน Component แม่
// เพื่อจัดการการปิด Sidebar เมื่อคลิกที่พื้นที่ด้านนอกบน Mobile
// โดยส่งฟังก์ชัน onClose มายัง Component นี้

export function AdminSidebar({ open, onClose }: { open: boolean, onClose: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { setTheme } = useTheme()

  const navItems = [
    {
      title: "แดชบอร์ด",
      href: "/admin/AdminDashboardPage",
      icon: LayoutDashboard,
    },
    {
      title: "จัดการผลสลาก",
      href: "/admin/lottery-results",
      icon: CalendarDays,
    },
    {
      title: "วันที่ออกสลาก",
      href: "/admin/lottery-dates",
      icon: CalendarDays,
    },
    {
      title: "จัดการบิลหวย",
      href: "/admin/tickets",
      icon: Ticket,
    },
    {
      title: "รายการที่ลบ",
      href: "/admin/lottery-ticket",
      icon: Trash,
    },
    {
      title: "จัดการประเภทหวย",
      href: "/admin/lotterysubtype",
      icon: Ticket,
    },
    {
      title: "จัดการผู้ใช้",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "รายงาน",
      href: "/admin/lottery-managesummary",
      icon: BarChart3,
    },
    {
      title: "การจ่ายเงิน",
      href: "/admin/payments",
      icon: FileText,
    },
    {
      title: "ประวัติการทำรายการ",
      href: "/admin/transactions",
      icon: ClipboardList,
    },
    {
      title: "จัดการ API หวย",
      href: "/admin/lottery-api-results",
      icon: Ticket,
    },
    {
      title: "ฐานข้อมูล",
      href: "/admin/database",
      icon: Database,
    },
    {
      title: "เติมเครดิต",
      href: "/admin/credit-topup",
      icon: ShieldCheck,
    },
    {
      title: "ตั้งค่าระบบ",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  return (
    <aside
      className={cn(
        "fixed md:static inset-y-0 left-0 h-full bg-white dark:bg-zinc-900 z-50 transition-all duration-300 transform",
        "md:border-r md:dark:border-zinc-800 shadow-lg md:shadow-none",
        // พฤติกรรมการแสดงผล: Mobile ใช้ translate, Desktop ใช้การปรับความกว้าง
        open ? "translate-x-0" : "-translate-x-full", // สำหรับ Mobile
        "md:translate-x-0", // สำหรับ Desktop ให้อยู่กับที่เสมอ
        // พฤติกรรมความกว้าง: Mobile กว้างเต็มที่, Desktop ย่อ-ขยายได้
        collapsed ? "w-64 md:w-16" : "w-64"
      )}
      aria-label="Sidebar"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b dark:border-zinc-800">
        <span className={cn("font-bold", collapsed && "hidden md:hidden")}>
          เมนู
        </span>
        {/* ปุ่มย่อ-ขยาย แสดงเฉพาะบน Desktop */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden md:block" // ซ่อนบน mobile
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
        </button>
      </div>

      {/* Back to Home Link */}
      <div className="px-4 py-3 border-b dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium">
          <Home className="h-5 w-5" />
          <span className={cn(collapsed && "hidden md:hidden")}>กลับหน้าหลัก</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="mt-4 space-y-1 px-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
                "flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors",
                pathname === item.href && "bg-gray-100 dark:bg-zinc-800" // Highlight active link
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className={cn("whitespace-nowrap", collapsed && "hidden md:hidden")}>{item.title}</span>
          </Link>
        ))}
      </nav>
      
      {/* Theme Switcher */}
      <div className="absolute bottom-0 left-0 w-full border-t dark:border-zinc-800 p-3 flex justify-center bg-white dark:bg-zinc-900">
        <div className={cn(collapsed && "hidden md:hidden")}>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg text-zinc-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[130px] z-[9999] bg-zinc-900 text-slate-100 border-zinc-700 shadow-xl">
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-zinc-800 focus:!bg-zinc-800 !text-slate-100">
                <Sun className="h-4 w-4" />
                Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-zinc-800 focus:!bg-zinc-800 !text-slate-100">
                <Moon className="h-4 w-4" />
                Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-zinc-800 focus:!bg-zinc-800 !text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                System
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </aside>
  )
}