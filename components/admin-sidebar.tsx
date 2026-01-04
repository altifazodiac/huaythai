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
  Calculator,
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

export function AdminSidebar({ 
  open, 
  onClose, 
  collapsed, 
  onToggleCollapse 
}: { 
  open: boolean, 
  onClose: () => void,
  collapsed: boolean,
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
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
      title: "จัดการประเภทหวย",
      href: "/lotterysubtype",
      icon: Ticket,
    },
 
    {
      title: "วิเคราะห์ข้อมูลการซื้อหวย",
      href: "/paid-analysis",
      icon: BarChart3,
    },
    {
      title: "ประวัติการทำธุรกรรมเครดิต",
      href: "/CreditHistory",
      icon: CreditCard,
    },
    {
      title: "สรุปยอดรายได้",
      href: "/lottery-report-summary",
      icon: BarChart3,
    },
    {
      title: "รายการที่ลบ",
      href: "/lottery-ticketAd",
      icon: Trash,
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
        "fixed z-40 top-14 left-0 h-[calc(100vh-3.5rem)] border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-all duration-300 flex flex-col",
        open ? "translate-x-0" : "-translate-x-full",
        collapsed ? "w-16" : "w-64",
        "md:translate-x-0 md:static md:block"
      )}
      aria-label="Sidebar"
      tabIndex={open ? 0 : -1}
    >
      {/* Sidebar Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!collapsed && <span className="font-bold">เมนู</span>}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded hover:bg-sidebar-accent hidden md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded hover:bg-sidebar-accent"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Back to Home Link */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-sidebar-border">
        <Link 
          href="/" 
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded hover:bg-sidebar-accent hover:text-primary font-medium",
            collapsed && "justify-center"
          )} 
          onClick={handleNavClick}
          title={collapsed ? "กลับหน้าหลัก" : undefined}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>กลับหน้าหลัก</span>}
        </Link>
      </div>
      
      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto space-y-1 mt-4 px-4 pb-20">
        {navItems.map((item) =>
          item.items ? (
            <div key={item.title}>
              <button
                onClick={() => {
                  if (!collapsed) {
                    setOpenSubMenu(openSubMenu === item.title ? null : item.title)
                  }
                }}
                className={cn(
                  "flex items-center justify-between w-full gap-2 py-2 px-2 rounded hover:bg-sidebar-accent hover:text-primary transition-colors",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.title : undefined}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
                </div>
                {!collapsed && (
                  <ChevronDown className={cn("h-4 w-4 transition-transform", openSubMenu === item.title && "rotate-180")} />
                )}
              </button>
              {!collapsed && openSubMenu === item.title && (
                <div className="pl-5 space-y-1 py-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-2 py-2 px-4 rounded hover:bg-sidebar-accent hover:text-primary transition-colors text-sm",
                        pathname === subItem.href && "bg-sidebar-accent text-primary"
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
                "flex items-center gap-2 py-2 px-2 rounded hover:bg-sidebar-accent hover:text-primary transition-colors",
                collapsed && "justify-center",
                pathname === item.href && "bg-sidebar-accent text-primary"
              )}
              onClick={handleNavClick}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
            </Link>
          )
        )}
      </nav>
      
      {/* Theme Switcher */}
      <div className="flex-shrink-0 absolute bottom-0 left-0 w-full border-t border-sidebar-border p-3 flex justify-center bg-sidebar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="rounded-lg relative group hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-[130px] z-[9999] bg-popover border-border"
          >
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm"
            >
              <Sun className="h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm"
            >
              <Moon className="h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm"
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