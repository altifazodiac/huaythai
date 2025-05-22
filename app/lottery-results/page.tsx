"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, Database, Settings, Trophy, Calendar, Clock, Info } from "lucide-react"
import type { LotteryResult, TicketSubType } from "@/types/lottery"
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
import { format, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function LotteryResultsPage() {
  const [results, setResults] = useState<Record<string, string[]>>({})
  const [drawDate, setDrawDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subTypes, setSubTypes] = useState<Record<string, TicketSubType>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(false)

  // Function to fetch lottery results from the API
  const fetchResults = async () => {
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      setSetupNeeded(false)

      const response = await fetch("/api/lottery-results")

      // Check Content-Type to ensure it's JSON before parsing
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response received:", textResponse.substring(0, 200))
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError)
        throw new Error("Failed to parse server response as JSON")
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.details || `API returned status ${response.status}`)
      }

      if (data.status === "success") {
        if (data.message) {
          setMessage(data.message)
        }

        if (data.data && data.data.length > 0) {
          // Group data by sub_type_id and map sub_types
          const groupedResults: Record<string, string[]> = {}
          const subTypesMap: Record<string, TicketSubType> = {}
          let latestDate: string | null = null

          data.data.forEach((result: LotteryResult) => {
            const subType = result.ticket_sub_types
            const draw = result.lottery_draws

            if (subType && draw) {
              // Keep track of the latest draw date
              if (!latestDate || new Date(draw.draw_date) > new Date(latestDate)) {
                latestDate = draw.draw_date
              }

              // Store sub_type information
              if (!subTypesMap[subType.id]) {
                subTypesMap[subType.id] = subType
              }

              // Store result numbers
              if (!groupedResults[subType.id]) {
                groupedResults[subType.id] = []
              }
              groupedResults[subType.id].push(result.number)
            }
          })

          setResults(groupedResults)
          setSubTypes(subTypesMap)
          setDrawDate(latestDate)
        } else {
          setMessage("ไม่พบข้อมูลผลรางวัล กรุณาเรียกใช้ API /api/latest เพื่อดึงข้อมูลล่าสุดก่อน")
        }
      } else if (
        data.status === "warning" &&
        (data.setupNeeded || data.message?.includes("table") || data.message?.includes("database"))
      ) {
        setSetupNeeded(true)
        setMessage(data.message)
      } else {
        throw new Error(data.message || "Failed to fetch lottery results")
      }
    } catch (err) {
      console.error("Failed to fetch lottery results:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch lottery results")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Effect hook to fetch results on component mount
  useEffect(() => {
    fetchResults()
  }, [])

  // Handler for refreshing data
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Call API to fetch latest data
      const response = await fetch("/api/latest")
      if (!response.ok) {
        throw new Error("Failed to fetch latest results")
      }

      // A small delay before refetching main results to show refreshing indicator
      setTimeout(() => {
        fetchResults()
      }, 1000)
    } catch (err) {
      console.error("Failed to refresh:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh results")
      setRefreshing(false)
    }
  }

  // Handler for setting up the database
  const handleSetupDatabase = async () => {
    setLoading(true)
    setError(null)
    setMessage("กำลังตั้งค่าฐานข้อมูล...")

    try {
      const response = await fetch("/api/setup-db")

      // Check Content-Type for setup API response
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Setup API returned non-JSON response. Status: ${response.status}`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || data?.details || `API returned status ${response.status}`)
      }

      setMessage(`ตั้งค่าฐานข้อมูลสำเร็จ: ${data.message}`)
      setSetupNeeded(false)

      // A small delay before refetching main results after setup
      setTimeout(() => {
        fetchResults()
      }, 1000)
    } catch (err) {
      console.error("Failed to setup database:", err)
      setError(err instanceof Error ? err.message : "Failed to setup database")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gray-50 dark:bg-gray-950">
          {/* Header section with breadcrumbs and sidebar trigger */}
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ease-in-out">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                      แดชบอร์ด
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>ผลสลากกินแบ่งล่าสุด</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main content area */}
          <div className="container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
            {/* Page title and action buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  ผลสลากกินแบ่งล่าสุด
                </h1>
                {drawDate && !loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{format(parseISO(drawDate), "d MMMM yyyy", { locale: th })}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {setupNeeded ? (
                  <Button
                    onClick={handleSetupDatabase}
                    disabled={loading}
                    size="lg"
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md transition-all duration-300 ease-in-out hover:shadow-lg"
                  >
                    <Database className="h-5 w-5" />
                    ตั้งค่าฐานข้อมูล
                  </Button>
                ) : (
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    size="lg"
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md transition-all duration-300 ease-in-out hover:shadow-lg"
                  >
                    <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
                  </Button>
                )}
              </div>
            </div>

            {/* Skeleton Loading State */}
            {loading && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-5 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {/* Skeleton for Draw Date */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" /> {/* Calendar icon */}
                      <Skeleton className="h-5 w-40" /> {/* Date text */}
                    </div>

                    {/* Skeletons for each lottery type, simulating the grid layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                        >
                          <Skeleton className="h-6 w-1/2 mb-3" /> {/* Skeleton for sub-type title */}
                          <Skeleton className="h-12 w-3/4" /> {/* Skeleton for result numbers */}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert
                variant="destructive"
                className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-md"
              >
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold">เกิดข้อผิดพลาด</AlertTitle>
                <AlertDescription className="text-base">
                  <div className="space-y-2">
                    <p>{error}</p>
                    <p className="text-sm">กรุณาตรวจสอบการตั้งค่า Supabase หรือลองรีเฟรชหน้าเว็บ</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* General Message (e.g., no data, success message) */}
            {message && !error && (
              <Alert
                className={cn(
                  "mb-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-md",
                  setupNeeded
                    ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    : "",
                )}
              >
                <Info className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold">ข้อความจากระบบ</AlertTitle>
                <AlertDescription className="text-base">{message}</AlertDescription>
              </Alert>
            )}

            {/* Display Lottery Results */}
            {!loading && !error && Object.keys(results).length > 0 && (
              <Card className="overflow-hidden border-0 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <CardHeader className="pb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-8 w-8" />
                    <CardTitle className="text-3xl md:text-4xl font-extrabold">
                      ผลรางวัลวันที่: {drawDate ? format(parseISO(drawDate), "d MMMM yyyy", { locale: th }) : "ไม่พบข้อมูล"}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-md text-emerald-100 mt-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    ข้อมูลอัปเดตล่าสุดจากฐานข้อมูล Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Render each lottery result type dynamically */}
                    {Object.entries(results).map(([subTypeId, numbers], index) => {
                      const subType = subTypes[subTypeId]
                      if (!subType) return null // Skip if subType data is missing

                      return (
                        <div
                          key={subTypeId}
                          className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <h3 className="font-semibold text-xl mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 text-sm font-bold">
                              {index + 1}
                            </span>
                            {subType.type_name}
                          </h3>
                          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-wide break-words group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">
                            {numbers.join(", ") || "N/A"}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-gray-500" />
                    ข้อมูลอ้างอิงจากสำนักงานสลากกินแบ่งรัฐบาล
                  </p>
                </CardFooter>
              </Card>
            )}

            {/* No Data Found Message */}
            {!loading && !error && Object.keys(results).length === 0 && !message && !setupNeeded && (
              <Card className="overflow-hidden border-0 shadow-lg animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="bg-gray-100 dark:bg-gray-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    ไม่พบข้อมูลผลรางวัล
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p>กรุณากดปุ่ม "รีเฟรชข้อมูล" เพื่อดึงข้อมูลล่าสุด</p>
                </CardContent>
                <CardFooter className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    รีเฟรชข้อมูล
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Setup Needed Card */}
            {setupNeeded && !loading && !error && (
              <Card className="overflow-hidden border-0 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="pb-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Settings className="h-6 w-6" />
                    ต้องตั้งค่าฐานข้อมูลก่อน
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg mb-6 border border-amber-200 dark:border-amber-800">
                    <p className="text-lg text-amber-800 dark:text-amber-300">
                      ระบบตรวจพบว่ายังไม่มีตารางฐานข้อมูลที่จำเป็น กรุณากดปุ่ม "ตั้งค่าฐานข้อมูล" เพื่อสร้างตารางที่จำเป็น
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleSetupDatabase}
                      disabled={loading}
                      size="lg"
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md transition-all duration-300 ease-in-out hover:shadow-lg"
                    >
                      <Database className="h-5 w-5" />
                      ตั้งค่าฐานข้อมูลทันที
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  )
}
