"use client"

import React, { useState, useEffect } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { LoadingProvider } from "@/components/LoadingProvider"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Responsive: ปิด sidebar อัตโนมัติบน mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
        setSidebarCollapsed(false)
      } else {
        setSidebarOpen(true)
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <LoadingProvider>
      {/* Navbar */}
      <header className="h-14 flex items-center px-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground fixed w-full z-50 top-0 left-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="mr-2 p-2 rounded hover:bg-sidebar-accent transition md:hidden"
          aria-label="Show sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
       
      </header>
      
      {/* Layout */}
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar + Overlay */}
        <AdminSidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}
        
        {/* Main content */}
        <main 
          className={cn(
            "flex-1 p-4 md:p-8 transition-all duration-300 pt-20",
            sidebarCollapsed ? "md:ml-1" : "md:ml-2"
          )}
        >
          {children}
        </main>
      </div>
    </LoadingProvider>
  )
}
