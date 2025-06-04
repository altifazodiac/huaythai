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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function AdminSidebar({ open, onClose }: { open: boolean, onClose: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const navItems = [
    {
      title: "แดชบอร์ด",
      href: "/admin/AdminDashboardPage",
      icon: LayoutDashboard,
    },
    {
      title: "จัดการผลสลาก",
      href: "/admin/lottery-results" ,
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
     
    { title: "รายการที่ลบ", 
      href: "/admin/lottery-ticket" ,
      icon: Trash,
    },
    { title: "จัดการประเภทหวย", 
      href: "/admin/lotterysubtype" ,
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
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("Navigating to home...")
    router.push("/")
    window.location.href = "/"
  }
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full bg-white z-50 transition-all duration-300 transform md:static md:translate-x-0 md:block md:border-r shadow-lg md:shadow-none",
        open ? "translate-x-0" : "-translate-x-full",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <span className={collapsed ? "hidden" : "font-bold"}>เมนู</span>
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
        </button>
      </div>
      <div className="px-4 py-3 border-b">
        <Link href="/" className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 font-medium">
          <Home className="h-5 w-5" />
          <span className={collapsed ? "hidden" : ""}>กลับหน้าหลัก</span>
        </Link>
      </div>
      <nav className="mt-4 space-y-1 px-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100">
            <item.icon className="h-5 w-5" />
            <span className={collapsed ? "hidden" : ""}>{item.title}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
