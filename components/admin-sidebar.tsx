"use client"

import React, { useState, useEffect } from "react"
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
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
  ChevronDown,
  Globe,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export function AdminSidebar({ open, onClose }: { open: boolean, onClose: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const { setTheme } = useTheme()

  // ปิด sidebar เมื่อคลิก link (บน mobile)
  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose();
  };

  // Responsive: ปิด sidebar อัตโนมัติบน mobile
  useEffect(() => {
    if (window.innerWidth >= 768 && !open) {
      onClose();
    }
  }, [open, onClose]);

  const navItems = [
    {
      title: "แดชบอร์ด",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "จัดการผลสลาก",
      href: "/lottery-results",
      icon: CalendarDays,
    },
    {
      title: "วันที่ออกสลาก",
      href: "/lottery-dates",
      icon: CalendarDays,
    },
    {
      title: "จัดการ Task Scheduler",
      href: "/task-manager",
      icon: Settings,
    },
    {
      title: "รายการที่ลบ",
      href: "/lottery-ticketAd",
      icon: Trash,
    },
    {
      title: "จัดการประเภทหวย",
      href: "/lotterysubtype",
      icon: Ticket,
    },
    {
      title: "ประวัติการทำธุรกรรมเครดิต",
      href: "/CreditHistory",
      icon: CreditCard,
    },
    {
      title: "รายงาน",
      href: "/lottery-managesummary",
      icon: BarChart3,
    },
    {
      title: "ประวัติการทำรายการ",
      href: "/transactions",
      icon: ClipboardList,
    },
    {
      title: "จัดการผู้ใช้",
      href: "/UsersManage",
      icon: Users,
    },
    {
      title: "ประวัติการเข้าใช้งาน",
      href: "/login-history",
      icon: Globe,
    },
    {
      title: "การแจ้งเตือนหวย",
      href: "/lottery-notifications",
      icon: Bell,
    },
    {
      title: "จัดการ API หวย",
      icon: Ticket,
      items: [
        {
          title: "รายการหวย API ทั้งหมด",
          href: "/lottery-api-results",
        },
        {
          title: "จับคู่ API หวย",
          href: "/lottery-typeof-api",
        },
        
        
      ],
    },
    {
      title: "เติมเครดิต",
      href: "/credit-topup",
      icon: ShieldCheck,
    },
    {
      title: "ตั้งค่าระบบ",
      href: "/setup",
      icon: Settings,
    },
  ]

  return (
    <aside
      className={cn(
        "fixed z-50 top-0 left-0 h-full border-r dark:border-warning-800 shadow-lg transition-transform duration-300 flex flex-col",
        open ? "translate-x-0" : "-translate-x-full",
        "w-64 md:translate-x-0 md:static md:block"
      )}
      style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      aria-label="Sidebar"
      tabIndex={open ? 0 : -1}
    >
      {/* Sidebar Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b dark:border-warning-800">
        <span className={cn("font-bold")}>เมนู</span>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-warning-800"
          aria-label="Close sidebar"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>
      {/* Back to Home Link */}
      <div className="flex-shrink-0 px-4 py-3 border-b dark:border-warning-800">
        <Link href="/" className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 hover:text-red-500 dark:hover:text-red-500   font-medium" onClick={handleNavClick}>
          <Home className="h-5 w-5" />
          <span>กลับหน้าหลัก</span>
        </Link>
      </div>
      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto space-y-1 mt-4 px-4 pb-20">
        {navItems.map((item) =>
          item.items ? (
            <div key={item.title}>
              <button
                onClick={() => {
                   setOpenSubMenu(openSubMenu === item.title ? null : item.title)
                }}
                className={cn(
                  "flex items-center justify-between w-full gap-2 py-2 px-2 rounded hover:bg-gray-100 dark:hover:text-red-500 hover:text-red-500 dark:hover:bg-warning-800 transition-colors"
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 flex-shrink-0 dark:hover:text-red-500" />
                  <span className="whitespace-nowrap dark:hover:text-red-500">{item.title}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", openSubMenu === item.title && "rotate-180")} />
              </button>
              {openSubMenu === item.title && (
                <div className="pl-5 space-y-1 py-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-2 py-2 px-4 rounded hover:bg-gray-100 hover:text-red-500 dark:hover:text-red-500  dark:hover:bg-warning-800 transition-colors text-sm",
                        pathname === subItem.href && "bg-gray-100 dark:bg-warning-800"
                      )}
                      onClick={handleNavClick}
                    >
                      <span className="whitespace-nowrap">{subItem.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 hover:text-red-500 dark:hover:text-red-500  transition-colors",
                pathname === item.href && "bg-gray-100 dark:bg-warning-800"
              )}
              onClick={handleNavClick}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="whitespace-nowrap">{item.title}</span>
            </Link>
          )
        )}
      </nav>
      {/* Theme Switcher */}
      <div className="flex-shrink-0 absolute bottom-0 left-0 w-full border-t dark:border-warning-800 p-3 flex justify-center"
        style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="rounded-lg relative group text-warning-700 hover:bg-gray-100 dark:text-warning-200 dark:hover:text-white dark:hover:bg-warning-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[130px] z-[9999] border-warning-700 shadow-xl"
            style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
          >
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-warning-100 dark:hover:!bg-warning-800 focus:!bg-warning-200 dark:focus:!bg-warning-800 !text-warning-900 dark:!text-slate-100"
            >
              <Sun className="h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-warning-100 dark:hover:!bg-warning-800 focus:!bg-warning-200 dark:focus:!bg-warning-800 !text-warning-900 dark:!text-slate-100"
            >
              <Moon className="h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-warning-100 dark:hover:!bg-warning-800 focus:!bg-warning-200 dark:focus:!bg-warning-800 !text-warning-900 dark:!text-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}