"use client"

import type * as React from "react"
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
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation" // Add this import
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  className?: string
}

export function AdminSidebar({ className, ...props }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = [
    {
      title: "แดชบอร์ด",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "จัดการผลสลาก",
      href: "/admin/lottery",
      icon: CalendarDays,
    },
    {
      title: "วันที่ออกสลาก",
      href: "/admin/lottery-dates",
      
      icon: CalendarDays,
    },
    {
      title: "จัดการตั๋ว",
      href: "/admin/tickets",
      icon: Ticket,
    },
    {
      title: "จัดการผู้ใช้",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "รายงาน",
      href: "/admin/reports",
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
      title: "สิทธิ์การเข้าถึง",
      href: "/admin/permissions",
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
    console.log("Navigating to home...") // เพิ่มบรรทัดนี้เพื่อ debug
    router.push("/")
    window.location.href = "/" // เพิ่มวิธีสำรอง
  }
  return (
    <Sidebar collapsible="icon" className={cn("border-r", className)} {...props}>
      <SidebarHeader className="h-14 flex items-center px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg">
          <ShieldCheck className="h-5 w-5" />
          <span>ระบบผู้ดูแล</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="px-3 py-2">
            
            <Button 
              variant="outline" 
              className="w-full justify-start mb-4"
              onClick={handleHomeClick}
            >
              <Home className="mr-2 h-4 w-4" />
              กลับหน้าหลัก
            </Button>
            
            <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground">เมนูผู้ดูแลระบบ</h3>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={pathname === item.href || pathname?.startsWith(`${item.href}/`) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="px-4 py-2">
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">สถานะระบบ</h3>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">ระบบทำงานปกติ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs">อัพเดทล่าสุด: 10 นาทีที่แล้ว</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="h-14 px-4 flex items-center">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            A
          </div>
          <div>
            <p className="font-medium">ผู้ดูแลระบบ</p>
            <p className="text-xs text-muted-foreground">admin@example.com</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
