"use client"

import React, { useState, useEffect } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { LoadingProvider } from "@/components/LoadingProvider"
import { Menu } from "lucide-react"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Responsive: ปิด sidebar อัตโนมัติบน mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <LoadingProvider>
      {/* Navbar */}
      <header
        className="h-14 flex items-center px-4 border-b dark:border-warning-800 fixed w-full z-30 top-0 left-0"
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)"
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="mr-2 p-2 rounded hover:bg-muted transition md:hidden"
          aria-label="Show sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-bold text-lg">Admin Panel</span>
      </header>
      {/* Layout */}
      <div
        className="flex pt-14 min-h-screen"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {/* Sidebar + Overlay */}
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}
        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 transition-all w-full" style={{ color: "var(--foreground)" }}>
          {children}
        </main>
      </div>
    </LoadingProvider>
  )
}
