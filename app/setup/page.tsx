"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Settings, Play } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DirectionProvider } from "@radix-ui/react-direction"

interface ConnectionStatus {
  status: string
  message: string
  data?: {
    connection: string
    ticketSubTypesCount: number
    lotteryTablesExist: boolean
    lotteryResultsCount: number
    environment: {
      hasUrl: boolean
      hasServiceRoleKey: boolean
      hasAnonKey: boolean
    }
  }
}

export default function SetupPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-connection")
      const data = await response.json()
      setConnectionStatus(data)
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message: "Failed to test connection",
      })
    } finally {
      setLoading(false)
    }
  }

  const setupTicketTypes = async () => {
    setSetupLoading("ticket-types")
    try {
      const response = await fetch("/api/setup-ticket-types", { method: "POST" })
      const data = await response.json()

      if (data.status === "success" || data.status === "info") {
        // รีเฟรชสถานะการเชื่อมต่อ
        await testConnection()
      }
    } catch (error) {
      console.error("Setup ticket types error:", error)
    } finally {
      setSetupLoading(null)
    }
  }

  const setupDatabase = async () => {
    setSetupLoading("database")
    try {
      const response = await fetch("/api/setup-db")
      const data = await response.json()

      if (data.status === "success" || data.status === "info") {
        // รีเฟรชสถานะการเชื่อมต่อ
        await testConnection()
      }
    } catch (error) {
      console.error("Setup database error:", error)
    } finally {
      setSetupLoading(null)
    }
  }

  const fetchLatestResults = async () => {
    setSetupLoading("fetch-results")
    try {
      const response = await fetch("/api/latest")
      const data = await response.json()

      if (data.status === "success") {
        // รีเฟรชสถานะการเชื่อมต่อ
        await testConnection()
      }
    } catch (error) {
      console.error("Fetch latest results error:", error)
    } finally {
      setSetupLoading(null)
    }
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>ตั้งค่าระบบ</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">ตั้งค่าระบบ</h1>
              <Button onClick={testConnection} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                ทดสอบการเชื่อมต่อ
              </Button>
            </div>

            {/* สถานะการเชื่อมต่อ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  สถานะการเชื่อมต่อ Supabase
                </CardTitle>
                <CardDescription>ตรวจสอบการเชื่อมต่อและการตั้งค่า environment variables</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    กำลังทดสอบการเชื่อมต่อ...
                  </div>
                )}

                {connectionStatus && !loading && (
                  <div className="space-y-4">
                    <Alert variant={connectionStatus.status === "success" ? "default" : "destructive"}>
                      {connectionStatus.status === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>{connectionStatus.status === "success" ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อไม่สำเร็จ"}</AlertTitle>
                      <AlertDescription>{connectionStatus.message}</AlertDescription>
                    </Alert>

                    {connectionStatus.data && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold">Environment Variables</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {connectionStatus.data.environment.hasUrl ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {connectionStatus.data.environment.hasAnonKey ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {connectionStatus.data.environment.hasServiceRoleKey ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="text-sm">SUPABASE_SERVICE_ROLE_KEY</span>
                              {!connectionStatus.data.environment.hasServiceRoleKey && (
                                <Badge variant="secondary">ไม่บังคับ</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold">สถานะฐานข้อมูล</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">
                                ticket_sub_types: {connectionStatus.data.ticketSubTypesCount} รายการ
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {connectionStatus.data.lotteryTablesExist ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">
                                lottery tables: {connectionStatus.data.lotteryTablesExist ? "มีอยู่" : "ไม่มี"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {connectionStatus.data.lotteryResultsCount > 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="text-sm">
                                lottery results: {connectionStatus.data.lotteryResultsCount} รายการ
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!connectionStatus && !loading && (
                  <div className="text-center text-muted-foreground">กดปุ่ม "ทดสอบการเชื่อมต่อ" เพื่อตรวจสอบสถานะ</div>
                )}
              </CardContent>
            </Card>

            {/* ขั้นตอนการตั้งค่า */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ขั้นตอนที่ 1: ตั้งค่า ticket types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. ตั้งค่าประเภทรางวัล</CardTitle>
                  <CardDescription>เพิ่มข้อมูลประเภทรางวัลลงในตาราง ticket_sub_types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      จำเป็นต้องมีข้อมูลประเภทรางวัล (สามตัวบน, สองตัวบน, ฯลฯ) ก่อนที่จะสามารถบันทึกผลรางวัลได้
                    </p>
                    {connectionStatus?.data && connectionStatus.data.ticketSubTypesCount > 0 && (
                      <Badge variant="outline" className="text-green-600">
                        ✓ มีข้อมูลแล้ว ({connectionStatus.data.ticketSubTypesCount} รายการ)
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={setupTicketTypes}
                    disabled={setupLoading === "ticket-types"}
                    className="w-full flex items-center gap-2"
                  >
                    {setupLoading === "ticket-types" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    {setupLoading === "ticket-types" ? "กำลังตั้งค่า..." : "ตั้งค่าประเภทรางวัล"}
                  </Button>
                </CardFooter>
              </Card>

              {/* ขั้นตอนที่ 2: สร้างตารางผลรางวัล */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. สร้างตารางผลรางวัล</CardTitle>
                  <CardDescription>สร้างตาราง lottery_draws และ lottery_results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">สร้างตารางสำหรับเก็บข้อมูลงวดสลากและผลรางวัลแต่ละประเภท</p>
                    {connectionStatus?.data && connectionStatus.data.lotteryTablesExist && (
                      <Badge variant="outline" className="text-green-600">
                        ✓ ตารางมีอยู่แล้ว
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={setupDatabase}
                    disabled={setupLoading === "database"}
                    className="w-full flex items-center gap-2"
                  >
                    {setupLoading === "database" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    {setupLoading === "database" ? "กำลังสร้าง..." : "สร้างตารางผลรางวัล"}
                  </Button>
                </CardFooter>
              </Card>

              {/* ขั้นตอนที่ 3: ดึงข้อมูลล่าสุด */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. ดึงข้อมูลล่าสุด</CardTitle>
                  <CardDescription>ดึงผลสลากกินแบ่งล่าสุดจาก API และบันทึกลงฐานข้อมูล</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">ดึงข้อมูลผลสลากกินแบ่งล่าสุดและบันทึกลงในฐานข้อมูลเพื่อทดสอบระบบ</p>
                    {connectionStatus?.data && connectionStatus.data.lotteryResultsCount > 0 && (
                      <Badge variant="outline" className="text-green-600">
                        ✓ มีข้อมูลแล้ว ({connectionStatus.data.lotteryResultsCount} รายการ)
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={fetchLatestResults}
                    disabled={setupLoading === "fetch-results"}
                    className="w-full flex items-center gap-2"
                  >
                    {setupLoading === "fetch-results" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {setupLoading === "fetch-results" ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลล่าสุด"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* ลิงก์ไปยังหน้าอื่นๆ */}
            {connectionStatus?.status === "success" && (
              <Card>
                <CardHeader>
                  <CardTitle>เสร็จสิ้นการตั้งค่า</CardTitle>
                  <CardDescription>ระบบพร้อมใช้งานแล้ว คุณสามารถเข้าไปดูผลรางวัลได้</CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-2">
                  <Button asChild>
                    <a href="/lottery-results">ดูผลรางวัลล่าสุด</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/">กลับหน้าแรก</a>
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  )
}
