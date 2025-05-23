"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useEffect, useState, useCallback } from "react"
import debounce from "lodash/debounce"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase/supabaseClient"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format, isValid } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { th } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Save, Check, X, Search, FileDown, ArrowUpDown, ChevronDown, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const THAILAND_TZ = "Asia/Bangkok"
const ITEMS_PER_PAGE = 10

interface TicketPurchaseItem {
  id: string
  ticket_sub_type_id: string
  ticket_number: string
  amount: number
  price: number
  total: number
  created_at: string
  sub_type_name: string
}

interface TicketPurchase {
  id: string
  transaction_id: string
  user_id: string
  ticket_set_name: string | null
  ticket_set_number: string
  created_at: string
  purchase_date: string
  deleted_at: string | null
  items: TicketPurchaseItem[]
}

interface LotteryResult {
  id: string
  lottery_date: string
  lottery_name: string
  first_prize: string
  created_at: string
  updated_at: string
  lottery_numbers: LotteryNumber[]
}

interface LotteryNumber {
  id: string
  lottery_result_id: string
  group_name: string
  lottery_number: string
  created_at: string
  updated_at: string
}

interface Match {
  ticketSetNumber: string
  ticketSetName: string | null
  ticketNumber: string
  subTypeName: string
  matchedGroup: string
  matchedLotteryNumber: string
  total: number
  amount: number
  price: number
}

interface GroupedMatches {
  [key: string]: {
    ticketSetNumber: string
    ticketSetName: string | null
    matches: Match[]
    totalAmount: number
    totalWinnings: number
    isPaid: boolean
    isSaved: boolean
    isSaving: boolean
  }
}

interface WinningTicketRecord {
  id?: string
  user_id: string
  lottery_date: string
  lottery_name: string
  ticket_set_number: string
  ticket_set_name: string | null
  total_amount: number
  total_winnings: number
  is_paid: boolean
  created_at?: string
  updated_at?: string
}

interface WinningTicketDetailRecord {
  id?: string
  winning_ticket_id: string
  ticket_number: string
  sub_type_name: string
  matched_group: string
  matched_lottery_number: string
  total: number
  amount: number
  price: number
  created_at?: string
  updated_at?: string
}

export default function TicketResultsPage() {
  const [latestLottery, setLatestLottery] = useState<LotteryResult | null>(null)
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatches>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "ticketSetNumber", direction: "ascending" })
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all")
  const [isExporting, setIsExporting] = useState(false)

  const convertUtcToThailandTime = (utcDateString: string) => {
    const utcDate = new Date(utcDateString)
    return toZonedTime(utcDate, THAILAND_TZ)
  }

  useEffect(() => {
    console.log("groupedMatches:", groupedMatches)
  }, [groupedMatches])

  const togglePaymentStatus = async (ticketSetNumber: string, newChecked: boolean) => {
    if (!user || !latestLottery) return

    try {
      // Get the lottery date
      let lotteryDate = ""
      try {
        const date = new Date(latestLottery.lottery_date)
        if (isValid(date)) {
          lotteryDate = format(date, "yyyy-MM-dd")
        }
      } catch (e) {
        console.error("Date formatting error:", e)
        return
      }

      // Update local state immediately for responsive UI
      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isPaid: newChecked,
        },
      }))

      // Update the database
      await updatePaymentStatus(ticketSetNumber, lotteryDate, newChecked)

      // Show success feedback
      toast.success(`อัพเดทสถานะการจ่ายเงินสำเร็จ`, { position: "top-center" })
    } catch (err: any) {
      console.error("Error updating payment status:", err)
      toast.error(`อัพเดทสถานะการจ่ายเงินไม่สำเร็จ: ${err.message}`, { position: "top-center" })

      // Revert UI state if update fails
      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isPaid: !newChecked,
        },
      }))
    }
  }

  const debouncedTogglePaymentStatus = useCallback(debounce(togglePaymentStatus, 300), [latestLottery, user])

  const updatePaymentStatus = async (ticketSetNumber: string, lotteryDate: string, isPaid: boolean) => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    const { data, error } = await supabase
      .from("winning_tickets")
      .update({
        is_paid: isPaid,
        updated_at: new Date().toISOString(),
      })
      .eq("ticket_set_number", ticketSetNumber)
      .eq("lottery_date", lotteryDate)
      .eq("user_id", user.id)
      .select()

    if (error) {
      console.error("Error updating payment status:", error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error("No records were updated")
    }

    return data[0]
  }

  const checkIfTicketSetExists = async (ticketSetNumber: string, lotteryDate: string) => {
    if (!user) return { exists: false, isPaid: false }

    const { data, error } = await supabase
      .from("winning_tickets")
      .select("id, is_paid")
      .eq("user_id", user.id)
      .eq("ticket_set_number", ticketSetNumber)
      .eq("lottery_date", lotteryDate)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - record doesn't exist
        return { exists: false, isPaid: false }
      }
      console.error("Error checking existing ticket:", error)
      return { exists: false, isPaid: false }
    }

    return {
      exists: true,
      isPaid: data?.is_paid || false,
    }
  }

  const fetchPaymentStatus = async (ticketSetNumber: string, lotteryDate: string) => {
    const result = await checkIfTicketSetExists(ticketSetNumber, lotteryDate)
    return result.isPaid
  }

  const saveWinningTicket = async (ticketSetNumber: string) => {
    if (!user || !latestLottery) return

    const group = groupedMatches[ticketSetNumber]
    if (!group) return

    try {
      if (group.isSaving) return

      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaving: true,
        },
      }))

      let lotteryDate = ""
      let lotteryName = "วันที่ไม่ระบุ"
      try {
        const date = new Date(latestLottery.lottery_date)
        if (isValid(date)) {
          lotteryDate = format(date, "yyyy-MM-dd")
          lotteryName = latestLottery.lottery_name || format(date, "dd MMM yyyy", { locale: th })
        }
      } catch (e) {
        console.error("Date formatting error:", e)
      }

      // Check if record already exists
      const ticketStatus = await checkIfTicketSetExists(ticketSetNumber, lotteryDate)
      if (ticketStatus.exists) {
        toast.error("บันทึกข้อมูลไม่สำเร็จ: ข้อมูลตั๋วชุดนี้ถูกบันทึกไปแล้ว", { position: "top-center" })

        // Update the state to reflect existing data
        setGroupedMatches((prev) => ({
          ...prev,
          [ticketSetNumber]: {
            ...prev[ticketSetNumber],
            isSaved: true,
            isPaid: ticketStatus.isPaid,
            isSaving: false,
          },
        }))
        return
      }

      const mainRecordData: WinningTicketRecord = {
        user_id: user.id,
        lottery_date: lotteryDate,
        lottery_name: lotteryName,
        ticket_set_number: group.ticketSetNumber,
        ticket_set_name: group.ticketSetName,
        total_amount: Math.floor(group.totalAmount),
        total_winnings: Math.floor(group.totalWinnings),
        is_paid: group.isPaid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mainResult = await supabase.from("winning_tickets").insert(mainRecordData).select()

      if (mainResult.error) {
        console.error("Supabase error (main record):", mainResult.error)
        throw new Error(mainResult.error.message)
      }

      if (!mainResult.data || mainResult.data.length === 0) {
        throw new Error("Failed to get winning ticket ID")
      }

      const winningTicketId = mainResult.data[0].id

      const detailRecords: WinningTicketDetailRecord[] = group.matches.map((match) => ({
        winning_ticket_id: winningTicketId,
        ticket_number: match.ticketNumber,
        sub_type_name: match.subTypeName,
        matched_group: match.matchedGroup,
        matched_lottery_number: match.matchedLotteryNumber,
        total: Math.floor(match.total),
        amount: Math.floor(match.amount),
        price: Math.floor(match.price),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const detailResult = await supabase.from("winning_ticket_details").insert(detailRecords)

      if (detailResult.error) {
        console.error("Supabase error (detail records):", detailResult.error)
        throw new Error(detailResult.error.message)
      }

      // Update the state without removing the row
      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaved: true,
          isSaving: false,
        },
      }))

      toast.success("บันทึกข้อมูลสำเร็จ", { position: "top-center" })
    } catch (err: any) {
      console.error("Error saving winning ticket:", err)
      toast.error(`บันทึกข้อมูลไม่สำเร็จ: ${err.message}`, { position: "top-center" })

      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaving: false,
        },
      }))
    }
  }

  const refreshTicketData = async () => {
    if (!user || !latestLottery) return

    try {
      const lotteryDate = format(new Date(latestLottery.lottery_date), "yyyy-MM-dd")

      // Get all existing winning tickets for this lottery date
      const { data: existingTickets, error } = await supabase
        .from("winning_tickets")
        .select("ticket_set_number, is_paid")
        .eq("user_id", user.id)
        .eq("lottery_date", lotteryDate)

      if (error) {
        console.error("Error fetching existing tickets:", error)
        return
      }

      // Update the grouped matches with existing data
      setGroupedMatches((prev) => {
        const updated = { ...prev }

        existingTickets?.forEach((ticket) => {
          if (updated[ticket.ticket_set_number]) {
            updated[ticket.ticket_set_number].isSaved = true
            updated[ticket.ticket_set_number].isPaid = ticket.is_paid || false
          }
        })

        return updated
      })
    } catch (err) {
      console.error("Error refreshing ticket data:", err)
    }
  }

  // Function to prepare data for export
  const prepareExportData = () => {
    // Get the data to export (either filtered or all)
    const dataToExport = filteredAndSortedGroupedMatches.map(([ticketSetNumber, group]) => {
      return {
        เลขชุด: ticketSetNumber,
        ชื่อชุด: group.ticketSetName || "ไม่มีชื่อ",
        จำนวนรายการ: group.matches.length,
        ยอดซื้อ: group.totalAmount,
        ยอดจ่าย: group.totalWinnings,
        สถานะ: group.isPaid ? "จ่ายแล้ว" : "ยังไม่ได้จ่าย",
        บันทึกแล้ว: group.isSaved ? "ใช่" : "ไม่",
      }
    })

    // Add summary row
    const summaryRow = {
      เลขชุด: "รวมทั้งหมด",
      ชื่อชุด: "",
      จำนวนรายการ: filteredAndSortedGroupedMatches.reduce((sum, [_, group]) => sum + group.matches.length, 0),
      ยอดซื้อ: filteredGrandTotalAmount,
      ยอดจ่าย: filteredGrandTotalWinnings,
      สถานะ: "",
      บันทึกแล้ว: "",
    }

    return {
      data: dataToExport,
      summary: summaryRow,
      lotteryDate: formattedDate,
    }
  }

  // Function to export to Excel
  const exportToExcel = () => {
    try {
      setIsExporting(true)
      const { data, summary, lotteryDate } = prepareExportData()

      // Set UTF-8 encoding for proper Thai language support
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data)

      // Add summary row
      XLSX.utils.sheet_add_json(ws, [summary], { skipHeader: true, origin: -1 })

      // Set column widths for better display
      const wscols = [
        { wch: 10 }, // เลขชุด
        { wch: 20 }, // ชื่อชุด
        { wch: 15 }, // จำนวนรายการ
        { wch: 15 }, // ยอดซื้อ
        { wch: 15 }, // ยอดจ่าย
        { wch: 15 }, // สถานะ
        { wch: 10 }, // บันทึกแล้ว
      ]
      ws["!cols"] = wscols

      XLSX.utils.book_append_sheet(wb, ws, "ผลการตรวจรางวัล")

      // Generate Excel file with UTF-8 encoding
      const fileName = `ผลการตรวจรางวัล_${lotteryDate.replace(/\s/g, "_")}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success("ดาวน์โหลดไฟล์ Excel สำเร็จ", { position: "top-center" })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ Excel", { position: "top-center" })
    } finally {
      setIsExporting(false)
    }
  }

  // Function to export to PDF
  const exportToPDF = () => {
    try {
      setIsExporting(true)
      const { data, summary, lotteryDate } = prepareExportData()

      // สร้างเอกสาร PDF โดยไม่ต้องพยายามโหลดฟอนต์ภาษาไทยจากภายนอก
      const doc = new jsPDF({
        orientation: "landscape", // ใช้แนวนอนเพื่อให้มีพื้นที่มากขึ้น
        unit: "mm",
        format: "a4",
      })

      // เพิ่มหัวเอกสาร
      doc.setFontSize(16)
      doc.text(`ผลการตรวจรางวัลสลากกินแบ่ง งวดวันที่: ${lotteryDate}`, 14, 15)

      // ใช้ autoTable โดยไม่ระบุฟอนต์เฉพาะ
      autoTable(doc, {
        head: [["เลขชุด", "ชื่อชุด", "จำนวนรายการ", "ยอดซื้อ", "ยอดจ่าย", "สถานะ", "บันทึกแล้ว"]],
        body: data.map((item) => [
          item.เลขชุด,
          item.ชื่อชุด,
          item.จำนวนรายการ,
          `${item.ยอดซื้อ.toLocaleString("th-TH")} บาท`,
          `${item.ยอดจ่าย.toLocaleString("th-TH")} บาท`,
          item.สถานะ,
          item.บันทึกแล้ว,
        ]),
        foot: [
          [
            summary.เลขชุด,
            summary.ชื่อชุด,
            summary.จำนวนรายการ,
            `${summary.ยอดซื้อ.toLocaleString("th-TH")} บาท`,
            `${summary.ยอดจ่าย.toLocaleString("th-TH")} บาท`,
            summary.สถานะ,
            summary.บันทึกแล้ว,
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        bodyStyles: { fontSize: 10 },
        footStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", fontSize: 10 },
        startY: 25,
        didDrawPage: (data) => {
          // เพิ่มเลขหน้าที่ด้านล่าง
          doc.setFontSize(10)
          doc.text(
            `หน้า ${doc.getCurrentPageInfo().pageNumber} จาก ${doc.getNumberOfPages()}`,
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10,
          )
        },
      })

      // เพิ่มส่วนสรุปด้านล่าง
      const finalY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(12)
      doc.text(`ยอดรวมจ่ายทั้งหมด: ${filteredGrandTotalWinnings.toLocaleString("th-TH")} บาท`, 14, finalY)
      doc.text(`จ่ายแล้ว: ${filteredPaidTotal.toLocaleString("th-TH")} บาท`, 14, finalY + 7)
      doc.text(`ยังไม่ได้จ่าย: ${filteredUnpaidTotal.toLocaleString("th-TH")} บาท`, 14, finalY + 14)

      // บันทึกไฟล์ PDF
      const fileName = `ผลการตรวจรางวัล_${lotteryDate.replace(/\s/g, "_")}.pdf`
      doc.save(fileName)

      toast.success("ดาวน์โหลดไฟล์ PDF สำเร็จ", { position: "top-center" })
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ PDF", { position: "top-center" })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // ดึงข้อมูลผู้ใช้
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) {
          setError("กรุณาเข้าสู่ระบบเพื่อดูผลการตรวจรางวัล")
          return
        }
        setUser(user)

        // ดึงข้อมูลผลสลากล่าสุดจาก Supabase แทนการใช้ API
        const { data: lotteryData, error: lotteryError } = await supabase
          .from("lottery_results")
          .select(`
            *,
            lottery_draws (id, draw_date),
            ticket_sub_types (type_name)
          `)
          .order("draw_id", { ascending: false })
          .limit(1)
          .single()

        if (lotteryError) throw new Error(`ไม่พบข้อมูลผลสลากล่าสุด: ${lotteryError.message}`)

        setLatestLottery({
          ...lotteryData,
          lottery_date: lotteryData.lottery_draws.draw_date,
          lottery_numbers: [],
        } as LotteryResult)

        const lotteryDate = new Date(lotteryData.lottery_draws.draw_date)
        if (!isValid(lotteryDate)) {
          throw new Error(`วันที่ไม่ถูกต้อง: ${lotteryData.lottery_draws.draw_date}`)
        }

        // ดึงข้อมูลการซื้อตั๋ว
        const { data: ticketData, error: ticketError } = await supabase
          .from("ticket_purchases")
          .select(`
            id,
            transaction_id,
            user_id,
            ticket_set_name,
            ticket_set_number,
            created_at,
            purchase_date,
            deleted_at,
            ticket_purchase_items (
              id,
              ticket_sub_type_id,
              ticket_number,
              amount,
              price,
              total,
              created_at,
              ticket_sub_types (type_name, id)
            )
          `)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("purchase_date", { ascending: false })
          .order("created_at", { ascending: false })

        if (ticketError) throw new Error(`ไม่สามารถดึงข้อมูลการซื้อตั๋ว: ${ticketError.message}`)

        const formattedPurchases: TicketPurchase[] = (ticketData || []).map((purchase) => ({
          ...purchase,
          created_at: convertUtcToThailandTime(purchase.created_at).toISOString(),
          purchase_date: format(convertUtcToThailandTime(purchase.purchase_date), "yyyy-MM-dd"),
          deleted_at: purchase.deleted_at ? convertUtcToThailandTime(purchase.deleted_at).toISOString() : null,
          items: purchase.ticket_purchase_items.map((item: any) => ({
            ...item,
            id: item.id,
            ticket_sub_type_id: item.ticket_sub_type_id,
            ticket_number: item.ticket_number,
            amount: item.amount,
            price: item.price,
            total: item.total,
            created_at: convertUtcToThailandTime(item.created_at).toISOString(),
            sub_type_name: item.ticket_sub_types?.type_name || "Unknown",
          })),
        }))

        setPurchases(formattedPurchases)

        // สร้าง mapping ของกลุ่มรางวัลและเลขที่ออก
        const groupMapping: { [key: string]: { group: string; numbers: string[] } } = {}

        // ดึงข้อมูล lottery_numbers จาก lottery_results แทน
        const { data: lotteryNumbersData, error: lotteryNumbersError } = await supabase
          .from("lottery_results")
          .select(`
            id,
            number,
            sub_type_id,
            ticket_sub_types (type_name)
          `)
          .eq("draw_id", lotteryData.lottery_draws.id)

        if (lotteryNumbersError) {
          throw new Error(`ไม่สามารถดึงข้อมูลหมายเลขสลาก: ${lotteryNumbersError.message}`)
        }

        // จัดกลุ่มเลขรางวัลตามประเภท
        lotteryNumbersData.forEach((lotteryNumber: any) => {
          const subTypeName = lotteryNumber.ticket_sub_types?.type_name
          if (!groupMapping[subTypeName]) {
            groupMapping[subTypeName] = {
              group: subTypeName,
              numbers: [],
            }
          }
          groupMapping[subTypeName].numbers.push(lotteryNumber.number)
        })

        const newMatches: Match[] = []

        // ตรวจสอบการถูกรางวัล
        formattedPurchases.forEach((purchase) => {
          purchase.items.forEach((item) => {
            const ticketNumber = item.ticket_number
            const subTypeName = item.sub_type_name

            const matchedGroup = groupMapping[subTypeName]
            if (matchedGroup) {
              matchedGroup.numbers.forEach((lotteryNumber) => {
                if (ticketNumber === lotteryNumber) {
                  newMatches.push({
                    ticketSetNumber: purchase.ticket_set_number,
                    ticketSetName: purchase.ticket_set_name,
                    ticketNumber,
                    subTypeName,
                    matchedGroup: matchedGroup.group,
                    matchedLotteryNumber: lotteryNumber,
                    total: item.total,
                    amount: item.amount,
                    price: item.price,
                  })
                }
              })
            }
          })
        })

        setMatches(newMatches)

        // จัดกลุ่มตั๋วที่ถูกรางวัล
        const grouped = newMatches.reduce<GroupedMatches>((groups, match) => {
          const key = match.ticketSetNumber
          if (!groups[key]) {
            groups[key] = {
              ticketSetNumber: match.ticketSetNumber,
              ticketSetName: match.ticketSetName,
              matches: [],
              totalAmount: 0,
              totalWinnings: 0,
              isPaid: false,
              isSaved: false,
              isSaving: false,
            }
          }
          groups[key].matches.push(match)
          groups[key].totalAmount += match.amount
          groups[key].totalWinnings += match.total
          return groups
        }, {})

        // ตรวจสอบสถานะการบันทึกและการจ่ายเงิน
        for (const ticketSetNumber in grouped) {
          try {
            const lotteryDate = format(new Date(lotteryData.lottery_draws.draw_date), "yyyy-MM-dd")
            const ticketStatus = await checkIfTicketSetExists(ticketSetNumber, lotteryDate)

            if (ticketStatus.exists) {
              grouped[ticketSetNumber].isSaved = true
              grouped[ticketSetNumber].isPaid = ticketStatus.isPaid
            }
          } catch (err) {
            console.error("Error checking ticket set status:", err)
          }
        }
        setGroupedMatches(grouped)
      } catch (err: any) {
        setError(`เกิดข้อผิดพลาด: ${err.message}`)
        toast.error(`เกิดข้อผิดพลาด: ${err.message}`, { position: "top-center" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (user && latestLottery && Object.keys(groupedMatches).length > 0) {
      refreshTicketData()
    }
  }, [user, latestLottery, Object.keys(groupedMatches).length])

  // Sorting function
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Filter and sort the grouped matches
  const filteredAndSortedGroupedMatches = Object.entries(groupedMatches)
    .filter(([_, group]) => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          group.ticketSetNumber.toLowerCase().includes(searchLower) ||
          (group.ticketSetName && group.ticketSetName.toLowerCase().includes(searchLower)) ||
          group.matches.some(
            (match) =>
              match.ticketNumber.toLowerCase().includes(searchLower) ||
              match.subTypeName.toLowerCase().includes(searchLower),
          )
        )
      }

      // Apply status filter
      if (filterStatus === "paid") return group.isPaid
      if (filterStatus === "unpaid") return !group.isPaid
      return true
    })
    .sort(([keyA, groupA], [keyB, groupB]) => {
      // Apply sorting
      if (sortConfig.key === "ticketSetNumber") {
        return sortConfig.direction === "ascending" ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
      }
      if (sortConfig.key === "totalWinnings") {
        return sortConfig.direction === "ascending"
          ? groupA.totalWinnings - groupB.totalWinnings
          : groupB.totalWinnings - groupA.totalWinnings
      }
      if (sortConfig.key === "totalAmount") {
        return sortConfig.direction === "ascending"
          ? groupA.totalAmount - groupB.totalAmount
          : groupB.totalAmount - groupA.totalAmount
      }
      return 0
    })

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedGroupedMatches.length / ITEMS_PER_PAGE)
  const paginatedGroupedMatches = filteredAndSortedGroupedMatches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Calculate grand totals from filtered data
  const filteredGrandTotalAmount = filteredAndSortedGroupedMatches.reduce(
    (sum, [_, group]) => sum + group.totalAmount,
    0,
  )
  const filteredGrandTotalWinnings = filteredAndSortedGroupedMatches.reduce(
    (sum, [_, group]) => sum + group.totalWinnings,
    0,
  )

  // Calculate paid and unpaid totals
  const filteredPaidTotal = filteredAndSortedGroupedMatches.reduce(
    (sum, [_, group]) => sum + (group.isPaid && group.isSaved ? group.totalWinnings : 0),
    0,
  )
  const filteredUnpaidTotal = filteredAndSortedGroupedMatches.reduce(
    (sum, [_, group]) => sum + (!group.isPaid && group.isSaved ? group.totalWinnings : 0),
    0,
  )

  if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>
  if (isLoading || !latestLottery)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    )

  let formattedDate = "วันที่ไม่ระบุ"
  try {
    const lotteryDate = new Date(latestLottery.lottery_date)
    if (isValid(lotteryDate)) {
      formattedDate = latestLottery.lottery_name || format(lotteryDate, "dd MMM yyyy", { locale: th })
    }
  } catch (e) {
    console.error("Date formatting error:", e, "Date:", latestLottery.lottery_date)
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                    <BreadcrumbPage>ผลการตรวจรางวัล</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">ผลการตรวจรางวัลสลากกินแบ่ง</h1>
                <p className="text-muted-foreground">งวดวันที่: {formattedDate}</p>
              </div>

              <Card className="bg-primary/5 border-none shadow-none">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="text-center md:text-left">
                      <p className="text-sm text-muted-foreground">ยอดรวมซื้อทั้งหมด</p>
                      <p className="text-lg font-medium">{filteredGrandTotalAmount.toLocaleString("th-TH")} บาท</p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-sm text-muted-foreground">ยอดรวมจ่ายทั้งหมด</p>
                      <p className="text-xl font-semibold text-green-600">
                        {filteredGrandTotalWinnings.toLocaleString("th-TH")} บาท
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center md:text-left">
                        <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                        <p className="text-lg font-medium text-green-600">
                          {filteredPaidTotal.toLocaleString("th-TH")} บาท
                        </p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-sm text-muted-foreground">ยังไม่ได้จ่าย</p>
                        <p className="text-lg font-medium text-red-500">
                          {filteredUnpaidTotal.toLocaleString("th-TH")} บาท
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {matches.length === 0 ? (
              <div className="bg-background border rounded-lg p-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">ไม่พบหมายเลขตั๋วที่ถูกรางวัล</h2>
                <p className="mt-2 text-center text-muted-foreground">ไม่พบหมายเลขตั๋วที่ถูกรางวัลสำหรับงวดนี้</p>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="ค้นหา..."
                          className="w-full pl-8"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>

                      <Select
                        value={filterStatus}
                        onValueChange={(value) => {
                          setFilterStatus(value as "all" | "paid" | "unpaid")
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue placeholder="สถานะทั้งหมด" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                          <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                          <SelectItem value="unpaid">ยังไม่ได้จ่าย</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isExporting || filteredAndSortedGroupedMatches.length === 0}
                          >
                            {isExporting ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></div>
                                กำลังดาวน์โหลด...
                              </>
                            ) : (
                              <>
                                <FileDown className="h-4 w-4 mr-1" />
                                ดาวน์โหลด
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>เลือกรูปแบบไฟล์</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={exportToExcel}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={exportToPDF}>
                            <FileText className="h-4 w-4 mr-2" />
                            PDF (.pdf)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => requestSort("ticketSetNumber")}
                            >
                              เลขชุด
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>ชื่อชุด</TableHead>
                          <TableHead>รายละเอียด</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => requestSort("totalAmount")}
                            >
                              ยอดซื้อ
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => requestSort("totalWinnings")}
                            >
                              ยอดจ่าย
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead className="text-right">การจัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedGroupedMatches.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedGroupedMatches.map(([ticketSetNumber, group]) => (
                            <TableRow key={ticketSetNumber}>
                              <TableCell className="font-medium">
                                <Badge variant="outline" className="bg-primary/5">
                                  {group.ticketSetNumber}
                                </Badge>
                              </TableCell>
                              <TableCell>{group.ticketSetName || "ไม่มีชื่อ"}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      {group.matches.length} รายการ
                                      <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-[300px]">
                                    <DropdownMenuLabel>รายละเอียดการถูกรางวัล</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {group.matches.map((match, idx) => (
                                      <DropdownMenuItem key={idx} className="flex flex-col items-start py-2">
                                        <div className="flex w-full justify-between">
                                          <span className="font-medium">{match.ticketNumber}</span>
                                          <span className="text-green-600">
                                            {match.total.toLocaleString("th-TH")} บาท
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {match.subTypeName} - {match.matchedGroup}
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell>{group.totalAmount.toLocaleString("th-TH")} บาท</TableCell>
                              <TableCell className="font-medium text-green-600">
                                {group.totalWinnings.toLocaleString("th-TH")} บาท
                              </TableCell>
                              <TableCell>
                                {group.isSaved ? (
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      id={`payment-status-${ticketSetNumber}`}
                                      checked={group.isPaid}
                                      onCheckedChange={(checked) =>
                                        debouncedTogglePaymentStatus(ticketSetNumber, checked)
                                      }
                                    />
                                    <Label htmlFor={`payment-status-${ticketSetNumber}`} className="text-sm">
                                      {group.isPaid ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-600 border-green-200"
                                        >
                                          <Check className="w-3 h-3 mr-1" /> จ่ายแล้ว
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                          <X className="w-3 h-3 mr-1" /> ยังไม่ได้จ่าย
                                        </Badge>
                                      )}
                                    </Label>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                    รอยืนยัน
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => saveWinningTicket(ticketSetNumber)}
                                  disabled={group.isSaved || group.isSaving}
                                  variant={group.isSaved ? "outline" : "default"}
                                >
                                  {group.isSaving ? (
                                    <>
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></div>
                                      กำลังบันทึก
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4 mr-1" />
                                      {group.isSaved ? "ยืนยันแล้ว" : "ยืนยัน"}
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            {currentPage === 1 ? (
                              <PaginationPrevious aria-disabled className="cursor-not-allowed opacity-50" />
                            ) : (
                              <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                            )}
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber
                            if (totalPages <= 5) {
                              pageNumber = i + 1
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1
                              if (i === 4)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i
                              if (i === 0)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                            } else {
                              if (i === 0)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                                  </PaginationItem>
                                )
                              if (i === 1)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              if (i === 3)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              if (i === 4)
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                                      {totalPages}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              pageNumber = currentPage + i - 2
                            }

                            return (
                              <PaginationItem key={i}>
                                <PaginationLink
                                  isActive={currentPage === pageNumber}
                                  onClick={() => setCurrentPage(pageNumber)}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          })}

                          <PaginationItem>
                            {currentPage === totalPages ? (
                              <PaginationNext aria-disabled className="cursor-not-allowed opacity-50" />
                            ) : (
                              <PaginationNext
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                              />
                            )}
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row justify-between border-t pt-6">
                  <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
                    แสดง {paginatedGroupedMatches.length} จาก {filteredAndSortedGroupedMatches.length} รายการ
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">ยอดรวมซื้อ:</span>
                      <span className="font-medium">{filteredGrandTotalAmount.toLocaleString("th-TH")} บาท</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">ยอดรวมจ่าย:</span>
                      <span className="font-semibold text-green-600">
                        {filteredGrandTotalWinnings.toLocaleString("th-TH")} บาท
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">จ่ายแล้ว:</span>
                        <span className="font-medium text-green-600">
                          {filteredPaidTotal.toLocaleString("th-TH")} บาท
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">ยังไม่ได้จ่าย:</span>
                        <span className="font-medium text-red-500">
                          {filteredUnpaidTotal.toLocaleString("th-TH")} บาท
                        </span>
                      </div>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  )
}
