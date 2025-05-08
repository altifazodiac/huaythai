import type React from "react"
import { AdminLayout } from "@/components/admin-layout"

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
