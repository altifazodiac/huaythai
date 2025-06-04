"use client"

import React, { useState, useEffect } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { LoadingProvider } from "@/components/LoadingProvider"
import { Menu } from "lucide-react"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true)
      else setCollapsed(false)
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <LoadingProvider>
      <SidebarProvider>
        {/* Navbar */}
        <div className="h-14 flex items-center px-4 bg-white border-b">
          <button
            onClick={() => setCollapsed(false)}
            className="mr-2 p-2 rounded hover:bg-muted transition md:hidden"
            aria-label="Show sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          {/* ...ใส่โลโก้/ชื่อระบบ/ฯลฯ... */}
        </div>
        <div className="flex">
          {/* Backdrop overlay for mobile */}
          {!collapsed && (
            <div
              className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
              onClick={() => setCollapsed(true)}
              aria-label="Close sidebar overlay"
            />
          )}
          <AdminSidebar open={!collapsed} onClose={() => setCollapsed(true)} />
          <SidebarInset>
            <div className="flex-1">{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </LoadingProvider>
  )
}
