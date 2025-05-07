"use client"

import { useEffect, useState, useCallback } from "react"
import debounce from "lodash/debounce";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { LottoDetailResponse, ApiErrorResponse } from "@/types/lottery"
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
import { toast } from 'sonner'
import { format, isValid } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { th } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Save, Check, X } from "lucide-react"

const THAILAND_TZ = "Asia/Bangkok"

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
  const [latestLottery, setLatestLottery] = useState<LottoDetailResponse | null>(null)
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatches>({})

  const convertUtcToThailandTime = (utcDateString: string) => {
    const utcDate = new Date(utcDateString)
    return toZonedTime(utcDate, THAILAND_TZ)
  }

  useEffect(() => {
    console.log("groupedMatches:", groupedMatches);
  }, [groupedMatches]);
  
  const togglePaymentStatus = async (ticketSetNumber: string, newChecked: boolean) => {
    if (!user || !latestLottery) return;
  
    try {
      // Get the lottery date
      let lotteryDate = "";
      try {
        const date = new Date(latestLottery.response.date);
        if (isValid(date)) {
          lotteryDate = format(date, "yyyy-MM-dd");
        }
      } catch (e) {
        console.error("Date formatting error:", e);
        return;
      }
  
      // Update local state immediately for responsive UI
      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isPaid: newChecked,
        },
      }));
  
      // Update the database
      await updatePaymentStatus(ticketSetNumber, lotteryDate, newChecked);
  
      // Show success feedback
      toast.success(`อัพเดทสถานะการจ่ายเงินสำเร็จ`, { position: "top-center" });
    } catch (err: any) {
      console.error("Error updating payment status:", err);
      toast.error(`อัพเดทสถานะการจ่ายเงินไม่สำเร็จ: ${err.message}`, { position: "top-center" });
      
      // Revert UI state if update fails
      setGroupedMatches((prev) => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isPaid: !newChecked,
        },
      }));
    }
  };

  const debouncedTogglePaymentStatus = useCallback(
    debounce(togglePaymentStatus, 300),
    [latestLottery, user]
  );

  const fetchPaymentStatus = async (ticketSetNumber: string, lotteryDate: string) => {
    const { data, error } = await supabase
      .from('winning_tickets')
      .select('is_paid')
      .eq('ticket_set_number', ticketSetNumber)
      .eq('lottery_date', lotteryDate)
      .single();
  
    if (error) {
      console.error('Error fetching payment status:', error);
      return false;
    }
  
    return data?.is_paid || false;
  };

  const updatePaymentStatus = async (ticketSetNumber: string, lotteryDate: string, isPaid: boolean) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
  
    const { data, error } = await supabase
      .from('winning_tickets')
      .update({ 
        is_paid: isPaid,
        updated_at: new Date().toISOString()
      })
      .eq('ticket_set_number', ticketSetNumber)
      .eq('lottery_date', lotteryDate)
      .eq('user_id', user.id)
      .select();
  
    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  
    if (!data || data.length === 0) {
      throw new Error("No records were updated");
    }
  
    return data[0];
  };

  const checkIfTicketSetExists = async (ticketSetNumber: string, lotteryDate: string) => {
    if (!user) return false
    
    const { data, error } = await supabase
      .from('winning_tickets')
      .select('id')
      .eq('user_id', user.id)
      .eq('ticket_set_number', ticketSetNumber)
      .eq('lottery_date', lotteryDate)
      .limit(1)

    if (error) {
      console.error('Error checking existing ticket:', error)
      return false
    }

    return data && data.length > 0
  }

  const saveWinningTicket = async (ticketSetNumber: string) => {
    if (!user || !latestLottery) return

    const group = groupedMatches[ticketSetNumber]
    if (!group) return

    try {
      if (group.isSaving) return
      
      setGroupedMatches(prev => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaving: true
        }
      }))

      let lotteryDate = ""
      let lotteryName = "วันที่ไม่ระบุ"
      try {
        const date = new Date(latestLottery.response.date)
        if (isValid(date)) {
          lotteryDate = format(date, "yyyy-MM-dd")
          lotteryName = format(date, "dd MMM yyyy", { locale: th })
        }
      } catch (e) {
        console.error("Date formatting error:", e)
      }

      const alreadyExists = await checkIfTicketSetExists(ticketSetNumber, lotteryDate)
      if (alreadyExists) {
        toast.error("บันทึกข้อมูลไม่สำเร็จ: ข้อมูลตั๋วชุดนี้ถูกบันทึกไปแล้ว", { position: "top-center" })
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

      setGroupedMatches(prev => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaved: true,
          isSaving: false
        }
      }))

      toast.success("บันทึกข้อมูลสำเร็จ", { position: "top-center" })
    } catch (err: any) {
      console.error("Error saving winning ticket:", err)
      toast.error(`บันทึกข้อมูลไม่สำเร็จ: ${err.message}`, { position: "top-center" })
      
      setGroupedMatches(prev => ({
        ...prev,
        [ticketSetNumber]: {
          ...prev[ticketSetNumber],
          isSaving: false
        }
      }))
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) {
          setError("กรุณาเข้าสู่ระบบเพื่อดูผลการตรวจรางวัล")
          return
        }
        setUser(user)

        const lotteryResponse = await fetch("/api/latest")
        if (!lotteryResponse.ok) {
          const errorData: ApiErrorResponse = await lotteryResponse.json()
          throw new Error(`Failed to fetch latest lottery: ${errorData.response}`)
        }
        const lotteryData: LottoDetailResponse = await lotteryResponse.json()
        setLatestLottery(lotteryData)

        const lotteryDate = new Date(lotteryData.response.date)
        if (!isValid(lotteryDate)) {
          throw new Error(`Invalid lottery date: ${lotteryData.response.date}`)
        }

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
              ticket_sub_types (type_name)
            )
          `)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("purchase_date", { ascending: false })
          .order("created_at", { ascending: false })

        if (ticketError) throw new Error(`Failed to fetch ticket purchases: ${ticketError.message}`)

        const formattedPurchases: TicketPurchase[] = (ticketData || []).map((purchase) => ({
          ...purchase,
          created_at: convertUtcToThailandTime(purchase.created_at).toISOString(),
          purchase_date: format(convertUtcToThailandTime(purchase.purchase_date), "yyyy-MM-dd"),
          deleted_at: purchase.deleted_at ? convertUtcToThailandTime(purchase.deleted_at).toISOString() : null,
          items: purchase.ticket_purchase_items.map((item: any) => ({
            ...item,
            created_at: convertUtcToThailandTime(item.created_at).toISOString(),
            sub_type_name: item.ticket_sub_types?.type_name || "Unknown",
          })),
        }))

        setPurchases(formattedPurchases)

        const newMatches: Match[] = []

        formattedPurchases.forEach((purchase) => {
          purchase.items.forEach((item) => {
            const ticketNumber = item.ticket_number
            const subTypeName = item.sub_type_name

            const groupMapping: { [key: string]: { group: string; numbers: string[] } } = {
              สามตัวบน: {
                group: "สามตัวบน",
                numbers: lotteryData.response.specialNumbers?.lastThreeDigits?.numbers || [],
              },
              สองตัวบน: { group: "สองตัวบน", numbers: lotteryData.response.specialNumbers?.lastTwoDigits?.numbers || [] },
              สองตัวล่าง: {
                group: "สองตัวล่าง",
                numbers: lotteryData.response.runningNumbers.find((r) => r.id === "runningNumberBackTwo")?.number || [],
              },
              สามตัวหน้า: {
                group: "สามตัวหน้า",
                numbers:
                  lotteryData.response.runningNumbers.find((r) => r.id === "runningNumberFrontThree")?.number || [],
              },
              สามตัวหลัง: {
                group: "สามตัวหลัง",
                numbers:
                  lotteryData.response.runningNumbers.find((r) => r.id === "runningNumberBackThree")?.number || [],
              },
              สามตัวโต๊ด: {
                group: "สามตัวโต๊ด",
                numbers: lotteryData.response.specialNumbers?.swappedThreeDigits?.numbers || [],
              },
              วิ่งบน: {
                group: "วิ่งบน",
                numbers: lotteryData.response.specialNumbers?.lastOneDigitPrizeFirst?.numbers || [],
              },
              วิ่งล่าง: {
                group: "วิ่งล่าง",
                numbers: lotteryData.response.specialNumbers?.lastOneDigitBackTwo?.numbers || [],
              },
            }

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

        for (const ticketSetNumber in grouped) {
          try {
            const lotteryDate = latestLottery ? format(new Date(latestLottery.response.date), "yyyy-MM-dd") : "";
            const exists = await checkIfTicketSetExists(ticketSetNumber, lotteryDate);
            if (exists) {
              grouped[ticketSetNumber].isSaved = true;
              const isPaid = await fetchPaymentStatus(ticketSetNumber, lotteryDate);
              grouped[ticketSetNumber].isPaid = isPaid;
            }
          } catch (err) {
            console.error("Error checking ticket set status:", err);
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

  if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>
  if (isLoading || !latestLottery) return <div className="container mx-auto p-4">กำลังโหลด...</div>

  let formattedDate = "วันที่ไม่ระบุ"
  try {
    const lotteryDate = new Date(latestLottery.response.date)
    if (isValid(lotteryDate)) {
      formattedDate = format(lotteryDate, "dd MMM yyyy", { locale: th })
    }
  } catch (e) {
    console.error("Date formatting error:", e, "Date:", latestLottery.response.date)
  }

  const grandTotalAmount = matches.reduce((sum, match) => sum + match.amount, 0)
  const grandTotalWinnings = matches.reduce((sum, match) => sum + match.total, 0)

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
                    <BreadcrumbPage>ผลการตรวจรางวัล</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">ผลการตรวจรางวัลสลากกินแบ่ง</h1>
            <Card>
              <CardHeader>
                <CardTitle>ผลรางวัลวันที่: {formattedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matches.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">ไม่พบหมายเลขตั๋วที่ถูกรางวัลสำหรับงวดนี้</div>
                  ) : (
                    <>
                      <h3 className="font-semibold">หมายเลขตั๋วที่ถูกรางวัล</h3>
                      {Object.entries(groupedMatches).map(([ticketSetNumber, group]) => (
                        <div key={ticketSetNumber} className="mb-4 border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-600">{group.ticketSetNumber}</Badge>
                            <p className="font-medium">{group.ticketSetName || "ไม่มีชื่อ"}</p>
                          </div>
                          <div className="pl-8 space-y-2">
                            {group.matches.map((match: Match, idx: number) => (
                              <div key={idx} className="p-2 rounded-lg hover:bg-gray-50">
                                <p className="text-sm text-gray-600">
                                  หมายเลข: <span className="font-semibold">{match.ticketNumber}</span> (
                                  {match.subTypeName})
                                </p>
                                <p className="text-sm text-gray-600">
                                  ถูกรางวัล: <span className="font-semibold">{match.matchedGroup}</span> (เลข{" "}
                                  {match.matchedLotteryNumber})
                                </p>
                                <p className="text-sm text-gray-600">
                                  จำนวนที่ได้:{" "}
                                  <span className="font-semibold text-green-600">
                                    {match.total.toLocaleString("th-TH", {
                                      style: "currency",
                                      currency: "THB",
                                      maximumFractionDigits: 0,
                                      minimumFractionDigits: 0,
                                    })}
                                  </span>{" "}
                                  ({match.amount}x{match.price}) บาท
                                </p>
                                <p className="text-sm text-gray-600">
                                  สถานะ: <span className="font-semibold text-green-500">ถูกรางวัล</span>
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between items-center">
                            <div className="flex items-center gap-4">
                            <Button
                                size="sm"
                                onClick={() => saveWinningTicket(ticketSetNumber)}
                                className="flex items-center gap-1"
                                disabled={group.isSaved || group.isSaving}
                              >
                                {group.isSaving ? (
                                  "กำลังบันทึก..."
                                ) : (
                                  <>
                                    <Save className="w-4 h-4" />
                                    {group.isSaved ? "ยืนยันแล้ว" : "ยืนยัน"}
                                  </>
                                )}
                              </Button>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`payment-status-${ticketSetNumber}`}
                                  checked={group.isPaid}
                                  onCheckedChange={(checked) => debouncedTogglePaymentStatus(ticketSetNumber, checked)}
                                  disabled={group.isSaved}
                                />
                                <Label htmlFor={`payment-status-${ticketSetNumber}`} className="text-sm">
                                  {group.isPaid ? (
                                    <span className="flex items-center text-green-600">
                                      <Check className="w-4 h-4 mr-1" /> จ่ายแล้ว
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-red-500">
                                      <X className="w-4 h-4 mr-1" /> ยังไม่ได้จ่าย
                                    </span>
                                  )}
                                </Label>
                              </div>
                              
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-600">ยอดรวมซื้อต่อบิล:</p>
                                <p className="font-semibold">
                                  {group.totalAmount.toLocaleString("th-TH", {
                                    style: "currency",
                                    currency: "THB",
                                    maximumFractionDigits: 0,
                                    minimumFractionDigits: 0,
                                  })}{" "}
                                  บาท
                                </p>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <p className="text-sm font-medium text-gray-600">รวมจ่ายต่อบิล:</p>
                                <p className="font-semibold text-green-600">
                                  {group.totalWinnings.toLocaleString("th-TH", {
                                    style: "currency",
                                    currency: "THB",
                                    maximumFractionDigits: 0,
                                    minimumFractionDigits: 0,
                                  })}{" "}
                                  บาท
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
              {matches.length > 0 && (
                <CardFooter className="flex justify-end border-t pt-4">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-600">ยอดรวมซื้อทั้งหมด:</p>
                      <p className="font-semibold">
                        {grandTotalAmount.toLocaleString("th-TH", {
                          style: "currency",
                          currency: "THB",
                          maximumFractionDigits: 0,
                          minimumFractionDigits: 0,
                        })}{" "}
                        บาท
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-sm font-medium text-gray-600">ยอดรวมจ่ายทั้งหมด:</p>
                      <p className="font-semibold text-red-600 text-lg">
                        {grandTotalWinnings.toLocaleString("th-TH", {
                          style: "currency",
                          currency: "THB",
                          maximumFractionDigits: 0,
                          minimumFractionDigits: 0,
                        })}{" "}
                        บาท
                      </p>
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  )
}