"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { toast } from "react-toastify"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Trash2, ArrowLeft, Plus, Minus, Bitcoin } from 'lucide-react'
import type { Ticket, TicketSubType } from "@/types/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { debounce } from "lodash"
import { format, startOfDay, addMonths, isBefore, isAfter, set } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { th } from "date-fns/locale"

// Define interfaces for the parsed JSON data
interface NumberSetsState {
  selectedNumbers: string[];
  selectedType: TicketSubType;
  useReverseNumbers: boolean;
  activeFilter: number | null;
}

interface TicketResult {
  id: string;
  result_date: string;
  ticket_sub_type_id: string;
  user_id: string;
  created_at: string;
}

// Animation variants
const fadeSlideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.3 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const ticketItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

// Thailand timezone
const THAILAND_TZ = "Asia/Bangkok"

const getThailandTime = () => {
  const now = new Date()
  return toZonedTime(now, THAILAND_TZ)
}

/**
 * Fetches the next lottery draw date from the database or calculates and inserts it if not found.
 * Draws occur on the 1st and 16th of each month.
 * - Between 1st 17:00 and 16th 15:00: Draw is on the 16th of the current month.
 * - Between 16th 17:00 and 1st 15:00 (next month): Draw is on the 1st of the next month.
 * @param supabase - Supabase client instance
 * @param thailandTime - Current time in Thailand timezone
 * @returns {Promise<string>} The next draw date in 'yyyy-MM-dd' format
 */
const getNextDrawDate = async (supabase: any, thailandTime: Date): Promise<string> => {
  const day = thailandTime.getDate()
  const hours = thailandTime.getHours()
  const minutes = thailandTime.getMinutes()

  let drawDate: Date

  // Set cutoff times
  const day1Cutoff = set(thailandTime, { date: 1, hours: 15, minutes: 0, seconds: 0, milliseconds: 0 })
  const day16Cutoff = set(thailandTime, { date: 16, hours: 15, minutes: 0, seconds: 0, milliseconds: 0 })
  const day1Evening = set(thailandTime, { date: 1, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 })
  const day16Evening = set(thailandTime, { date: 16, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 })

  // Calculate the target draw date based on purchase time
  if (
    (isAfter(thailandTime, day1Evening) && isBefore(thailandTime, day16Cutoff)) ||
    (day === 1 && hours >= 17) ||
    (day === 16 && hours < 15)
  ) {
    // Purchase is for the 16th of the current month
    drawDate = set(thailandTime, { date: 16 })
  } else if (
    (isAfter(thailandTime, day16Evening) && isBefore(thailandTime, addMonths(day1Cutoff, 1))) ||
    (day === 16 && hours >= 17) ||
    (day > 16) ||
    (day === 1 && hours < 15)
  ) {
    // Purchase is for the 1st of the next month
    drawDate = set(addMonths(thailandTime, 1), { date: 1 })
  } else {
    // Default case (e.g., exactly at cutoff times), set to next draw
    drawDate = set(thailandTime, { date: 16 })
    if (isAfter(thailandTime, day16Cutoff)) {
      drawDate = set(addMonths(thailandTime, 1), { date: 1 })
    }
  }

  const formattedDrawDate = format(drawDate, "yyyy-MM-dd")

  // Query the lottery_draw_dates table for the next draw date
  const { data: drawDates, error: drawError } = await supabase
    .from("lottery_draw_dates")
    .select("draw_date")
    .gte("draw_date", format(thailandTime, "yyyy-MM-dd"))
    .order("draw_date", { ascending: true })
    .limit(1)
    .single()

  if (drawError && drawError.code !== "PGRST116") {
    throw new Error(`Error fetching draw date: ${drawError.message}`)
  }

  if (drawDates) {
    return drawDates.draw_date
  }

  // If no draw date is found, insert the calculated draw date
  const { error: insertError } = await supabase
    .from("lottery_draw_dates")
    .insert({ draw_date: formattedDrawDate })

  if (insertError) {
    throw new Error(`Error inserting draw date: ${insertError.message}`)
  }

  return formattedDrawDate
}

export default function PriceEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const allTicketsParam = searchParams.get("allTickets")
  const numberSetsStateParam = searchParams.get("numberSetsState")

  // Update the JSON parsing with type assertions and validation
  const allTickets = allTicketsParam 
    ? (JSON.parse(allTicketsParam) as Ticket[]) 
    : [];

  const numberSetsState = numberSetsStateParam 
    ? (JSON.parse(numberSetsStateParam) as NumberSetsState)
    : undefined;

  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [tickets, setTickets] = useState<Ticket[]>(allTickets)
  const [amounts, setAmounts] = useState<{ [key: string]: number }>(
    allTickets.reduce(
      (acc: { [key: string]: number }, ticket: Ticket) => {
        acc[ticket.id] = 1
        return acc
      },
      {} as { [key: string]: number },
    ),
  )
  const [applyToAll, setApplyToAll] = useState<boolean>(false)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [topUpAmount, setTopUpAmount] = useState<string>("")
  const [showTopUp, setShowTopUp] = useState<boolean>(false)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [ticketName, setTicketName] = useState<string>("")
  const [ticketNumber, setTicketNumber] = useState<string>("")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>(
    numberSetsState?.selectedNumbers || []
  )
  const [selectedType, setSelectedType] = useState<TicketSubType>(
    numberSetsState?.selectedType || {
      id: "",
      type_name: "สามตัวบน",
      multiplication_factor: 900,
    }
  )
  const [useReverseNumbers, setUseReverseNumbers] = useState<boolean>(
    numberSetsState?.useReverseNumbers ?? false
  )
  const [activeFilter, setActiveFilter] = useState<number | null>(
    numberSetsState?.activeFilter ?? null
  )
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const [formattedDrawDate, setFormattedDrawDate] = useState<string>("")

  // Generate ticket number on mount
  useEffect(() => {
    const usedTicketNumbers = new Set<string>()
    const generateTicketNumber = (): string => {
      let number: number
      let ticketNumber: string
      do {
        number = Math.floor(Math.random() * 10000000)
        ticketNumber = number.toString().padStart(7, "0")
      } while (usedTicketNumbers.has(ticketNumber))
      usedTicketNumbers.add(ticketNumber)
      return ticketNumber
    }

    setTicketNumber(generateTicketNumber())
  }, [])

  // Get purchase date and draw date in Thailand timezone
  const thailandTime = getThailandTime()
  const purchaseDate = format(thailandTime, "yyyy-MM-dd", { locale: th })

  // Fetch draw date for display
  useEffect(() => {
    const fetchDrawDate = async () => {
      try {
        const drawDate = await getNextDrawDate(supabase, thailandTime)
        const formatted = format(new Date(drawDate), "วันที่ d MMMM yyyy", { locale: th })
        setFormattedDrawDate(formatted)
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดวันที่หวยออกได้: " + err.message)
      }
    }
    fetchDrawDate()
  }, [supabase])

  // Fetch ticket sub-types
  useEffect(() => {
    const fetchTicketSubTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_sub_types")
          .select("*")
          .order("type_name", { ascending: true })

        if (error) throw error
        if (data) {
          const typedData = data.map(item => ({
            id: String(item.id || ''),
            type_name: String(item.type_name || ''),
            multiplication_factor: Number(item.multiplication_factor || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined
          }))
          setTicketSubTypes(typedData)
        }
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message)
      }
    }
    fetchTicketSubTypes()
  }, [supabase])

  // Controlled function to update ticket info
  const updateTicketInfo = useCallback((newName: string, newNumber: string) => {
    setTicketName(newName)
    setTicketNumber(newNumber)
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        name: newName || t.name || "Unnamed Ticket",
        ticketNumber: newNumber || t.ticketNumber,
      }))
    )
  }, [])

  // Debounce ticket name updates to prevent rapid state changes
  const debouncedUpdateTicketInfo = useCallback(
    debounce((newName: string, newNumber: string) => {
      updateTicketInfo(newName, newNumber)
    }, 300),
    [updateTicketInfo]
  )

  // Handle ticket name change with debouncing
  const handleTicketNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setTicketName(newName)
    debouncedUpdateTicketInfo(newName, ticketNumber)
  }, [debouncedUpdateTicketInfo, ticketNumber])

  // Memoize the grouped tickets calculation
  const groupedTickets = useMemo(() => {
    return ticketSubTypes.reduce((acc, subType) => {
      const filtered = tickets.filter((t) => t.type_id === subType.id)
      if (filtered.length > 0) {
        acc[subType.type_name] = filtered
      }
      return acc
    }, {} as Record<string, Ticket[]>)
  }, [tickets, ticketSubTypes])

  const total = useMemo(() => {
    return tickets.reduce((sum, ticket) => {
      const amount = amounts[ticket.id] || 0
      return sum + amount
    }, 0)
  }, [amounts, tickets])

  const quickAmounts = [5, 10, 20, 50, 100]

  // Fetch user and balance
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }
        setUser(user)

        const { data: balanceData, error: balanceError } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single()

        if (balanceError && balanceError.code !== "PGRST116") {
          console.error("Error fetching balance:", balanceError)
          toast.error("ไม่สามารถโหลดยอดเครดิตได้")
          return
        }

        setBalance(typeof balanceData?.balance === "number" ? balanceData.balance : 0)
      } catch (err: any) {
        console.error("Error fetching user data:", err)
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router, supabase])

  // Update the balance subscription effect
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel("user_balances")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_balances",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.balance === 'number') {
            setBalance(payload.new.balance)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, supabase])

  const validateTopUp = useCallback(() => {
    const amount = Number(topUpAmount)
    if (isNaN(amount) || amount < 10) {
      toast.error("กรุณากรอกจำนวนเงินอย่างน้อย 10 บาท")
      return false
    }
    return true
  }, [topUpAmount])

  const handleTopUp = useCallback(async () => {
    if (!user || !validateTopUp()) return

    const amount = Number(topUpAmount)
    setIsLoading(true)
    try {
      const thailandTime = getThailandTime()
      const { data: balanceData, error: upsertError } = await supabase
        .from("user_balances")
        .upsert(
          {
            user_id: user.id,
            balance: balance + amount,
            updated_at: thailandTime.toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("balance")
        .single()

      if (upsertError) throw upsertError

      const { error: transactionError } = await supabase.from("credit_history").insert({
        user_id: user.id,
        user_name: user.user_metadata.name || "Unknown",
        amount,
        transaction_type: "deposit",
        description: "เติมเครดิตผ่านหน้า PriceEntry",
        created_at: thailandTime.toISOString(),
      })

      if (transactionError) throw transactionError

      if (balanceData) {
        setBalance(balanceData.balance as number)
      }
      setTopUpAmount("")
      setShowTopUp(false)
      toast.success(`เติมเครดิต ${amount.toFixed(0)} บาทสำเร็จ!`)
    } catch (err: any) {
      console.error("Error topping up:", err)
      toast.error(err.message || "เกิดข้อผิดพลาดในการเติมเครดิต")
    } finally {
      setIsLoading(false)
    }
  }, [user, balance, topUpAmount, supabase, validateTopUp])

  const handleAmountChange = useCallback((ticketId: string, value: number) => {
    setAmounts((prev) => ({
      ...prev,
      [ticketId]: value >= 0 ? value : 0,
    }))
  }, [])

  const handleQuickAmount = useCallback((amount: number) => {
    if (applyToAll) {
      setAmounts((prev) => {
        const newAmounts = { ...prev }
        tickets.forEach((ticket) => {
          newAmounts[ticket.id] = amount
        })
        return newAmounts
      })
    } else if (selectedTicketId) {
      setAmounts((prev) => ({
        ...prev,
        [selectedTicketId]: amount,
      }))
      setSelectedTicketId(null)
    }
  }, [applyToAll, selectedTicketId, tickets])

  const handleCustomAmountChange = useCallback((value: string) => {
    setCustomAmount(value)
    const amount = Number(value)
    if (!isNaN(amount) && amount >= 0 && applyToAll) {
      setAmounts((prev) => {
        const newAmounts = { ...prev }
        tickets.forEach((ticket) => {
          newAmounts[ticket.id] = amount
        })
        return newAmounts
      })
    }
  }, [applyToAll, tickets])

  const handleDelete = useCallback((ticketId: string) => {
    setAmounts((prev) => {
      const newAmounts = { ...prev }
      delete newAmounts[ticketId]
      return newAmounts
    })

    const remainingTickets = tickets.filter((ticket) => ticket.id !== ticketId)
    setTickets(remainingTickets)

    if (remainingTickets.length === 0) {
      const params = new URLSearchParams()
      params.set("allTickets", JSON.stringify([]))
      params.set("numberSetsState", JSON.stringify(numberSetsState))
      router.push(`/huaythai?${params.toString()}`)
    }
  }, [tickets, numberSetsState, router])

  const handleConfirm = useCallback(() => {
    if (!user) return

    if (total <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่มากกว่า 0")
      return
    }

    if (total > balance) {
      setShowInsufficientModal(true)
      return
    }

    setShowConfirmModal(true)
  }, [user, total, balance])

  const confirmPurchase = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const thailandTime = getThailandTime()
      const purchaseDate = format(thailandTime, "yyyy-MM-dd", { locale: th })
      const drawDate = await getNextDrawDate(supabase, thailandTime)

      const uniqueTypeIds = [...new Set(tickets.map((ticket) => ticket.type_id))]
      const ticketResultIds: { [typeId: string]: string } = {}

      for (const typeId of uniqueTypeIds) {
        const { data: resultData, error: resultError } = await supabase
          .from("ticket_results")
          .select("id")
          .eq("result_date", drawDate)
          .eq("ticket_sub_type_id", typeId)
          .limit(1)
          .single()

        if (resultError && resultError.code === "PGRST116") {
          const { data: newResult, error: insertError } = await supabase
            .from("ticket_results")
            .insert({
              result_date: drawDate,
              ticket_sub_type_id: typeId,
              user_id: user.id,
              created_at: thailandTime.toISOString(),
            })
            .select("id")
            .single() as { data: TicketResult | null, error: any }

          if (insertError || !newResult?.id) {
            throw new Error("Failed to create ticket result")
          }
          
          ticketResultIds[typeId] = newResult.id
        } else if (resultError) {
          throw resultError
        } else if (resultData) {
          ticketResultIds[typeId] = String(resultData.id)
        } else {
          throw new Error("No result data received")
        }
      }

      const { data: balanceData, error: upsertError } = await supabase
        .from("user_balances")
        .upsert(
          {
            user_id: user.id,
            balance: balance - total,
            updated_at: thailandTime.toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("balance")
        .single()

      if (upsertError) {
        console.error("Error updating balance:", upsertError)
        throw upsertError
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from("credit_history")
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.name || "Unknown",
          amount: total,
          transaction_type: "withdrawal",
          description: `ซื้อตั๋วลอตเตอรี่ ${tickets.length} รายการ (${ticketName || "Unnamed Ticket"})`,
          created_at: thailandTime.toISOString(),
        })
        .select("id")
        .single()

      if (transactionError) {
        console.error("Error inserting transaction:", transactionError)
        throw transactionError
      }

      const purchaseIds: { [typeId: string]: string } = {}
      for (const typeId of uniqueTypeIds) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from("ticket_purchases")
          .insert({
            transaction_id: transactionData?.id,
            user_id: user.id,
            ticket_set_name: ticketName || null,
            ticket_set_number: ticketNumber,
            created_at: thailandTime.toISOString(),
            purchase_date: purchaseDate,
            ticket_result_id: ticketResultIds[typeId],
          })
          .select("id")
          .single()

        if (purchaseError) {
          console.error("Error inserting ticket_purchase:", purchaseError)
          throw purchaseError
        }

        if (purchaseData && typeof purchaseData.id === "string") {
          purchaseIds[typeId] = purchaseData.id
        } else {
          throw new Error("Failed to get purchase ID")
        }
      }

      const ticketPurchaseItems = tickets.map((ticket) => ({
        ticket_purchase_id: purchaseIds[ticket.type_id],
        ticket_sub_type_id: ticket.type_id,
        ticket_number: ticket.number,
        amount: amounts[ticket.id] || 0,
        price: ticket.price,
        total: (amounts[ticket.id] || 0) * ticket.price,
        created_at: thailandTime.toISOString(),
      }))

      const { error: ticketItemError } = await supabase.from("ticket_purchase_items").insert(ticketPurchaseItems)

      if (ticketItemError) {
        console.error("Error inserting ticket_purchase_items:", ticketItemError)
        throw ticketItemError
      }

      if (balanceData && typeof balanceData.balance === "number") {
        setBalance(balanceData.balance)
      }
      toast.success(`ซื้อตั๋ว ${total.toFixed(0)} บาทสำเร็จ!`)

      const params = new URLSearchParams()
      params.set(
        "confirmedTickets",
        JSON.stringify(
          tickets.map((ticket) => ({
            ticket: { ...ticket, name: ticketName, ticketNumber },
            amount: amounts[ticket.id] || 0,
          })),
        ),
      )
      router.push(`/huaythai?${params.toString()}`)
    } catch (err: any) {
      console.error("Error confirming purchase:", err)
      toast.error(err.message || "เกิดข้อผิดพลาดในการซื้อตั๋ว")
    } finally {
      setIsLoading(false)
      setShowConfirmModal(false)
    }
  }, [user, tickets, amounts, balance, ticketName, ticketNumber, total, supabase, router])

  const handleBack = useCallback(() => {
    updateTicketInfo(ticketName, ticketNumber)
    const params = new URLSearchParams()
    params.set("allTickets", JSON.stringify(tickets))
    params.set(
      "numberSetsState",
      JSON.stringify({
        selectedNumbers,
        selectedType,
        useReverseNumbers,
        activeFilter,
      }),
    )
    router.push(`/huaythai?${params.toString()}`)
  }, [router, tickets, selectedNumbers, selectedType, useReverseNumbers, activeFilter, ticketName, ticketNumber, updateTicketInfo])

  const activeTicketTypes = Object.keys(groupedTickets)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="flex flex-col h-screen bg-gray-50 font-sans"
    >
      {/* Header */}
      <motion.div
        variants={fadeSlideIn}
        className="flex justify-between items-center px-4 py-3 bg-blue-700 text-white shadow-md"
      >
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold truncate">ระบุจำนวนเงิน</h1>
          <span className="text-sm text-blue-200">งวด{formattedDrawDate}</span>
        </div>
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <span className="text-sm text-blue-200 animate-pulse">กำลังโหลด...</span>
          ) : (
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-100">{user?.user_metadata?.name || "Guest"}</span>
              <span className="text-sm text-blue-200 flex items-center">
                <Bitcoin className="w-4 h-4 mr-1 text-blue-300" />
                {balance.toFixed(0)} บาท
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTopUp(!showTopUp)}
            className="text-sm text-white border-blue-300 bg-blue-600 hover:bg-blue-300 hover:text-blue-800 transition-colors"
          >
            เติมเงิน
          </Button>
        </div>
      </motion.div>

      {/* Top-Up Section */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeSlideIn}
            className="p-4 bg-gray-100 border-b border-gray-200"
          >
            <div className="flex justify-center gap-3">
              <Input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-40 p-2 text-sm text-center bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="จำนวนเงิน (ขั้นต่ำ 10 บาท)"
                min="10"
              />
              <Button
                onClick={handleTopUp}
                disabled={isLoading || topUpAmount === "" || isNaN(Number(topUpAmount)) || Number(topUpAmount) < 10}
                className="text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "กำลังดำเนินการ..." : "เติม"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Name and Number Section */}
      <motion.div variants={fadeSlideIn} className="p-4 bg-white border-b border-gray-200">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="ticket-name" className="text-sm font-medium text-blue-800">
              ชื่อรายการ
            </Label>
            <Input
              id="ticket-name"
              type="text"
              value={ticketName}
              required
              onChange={handleTicketNameChange}
              className="w-full max-w-xs p-2 text-sm bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="กรอกชื่อรายการ(เช่น ชื่อผู้ซื้อ)"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-blue-800">เลขตั๋ว</Label>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm font-medium">
              {ticketNumber}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Ticket List */}
      <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <motion.div variants={staggerContainer} className="flex flex-col space-y-4 p-4">
            {activeTicketTypes.length > 0 ? (
              activeTicketTypes.map((typeName) => (
                <motion.div key={typeName} variants={fadeSlideIn}>
                  <Card className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
                    <CardHeader className="bg-blue-100 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-blue-800 text-base">{typeName}</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs font-medium">
                          {groupedTickets[typeName]?.length || 0} รายการ
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-auto">
                        <AnimatePresence>
                          {groupedTickets[typeName].map((ticket, index) => (
                            <motion.div
                              key={ticket.id}
                              variants={ticketItemVariants}
                              className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                                selectedTicketId === ticket.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => setSelectedTicketId(ticket.id)}
                            >
                              <span className="text-sm text-gray-600 w-8 font-medium">{index + 1}.</span>
                              <div className="flex space-x-1 mr-3">
                                {ticket.number.split("").map((digit, i) => (
                                  <motion.span
                                    key={i}
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className="w-7 h-7 bg-blue-200 rounded-md flex items-center justify-center text-sm font-semibold text-blue-800 shadow-sm"
                                  >
                                    {digit}
                                  </motion.span>
                                ))}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-full border-gray-300 hover:bg-blue-100"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAmountChange(ticket.id, Math.max(0, amounts[ticket.id] - 1))
                                  }}
                                >
                                  <Minus className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Input
                                  type="number"
                                  value={amounts[ticket.id] || ""}
                                  onChange={(e) => handleAmountChange(ticket.id, Number(e.target.value))}
                                  className="w-24 p-1 text-sm text-center bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                  min="0"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-full border-gray-300 hover:bg-blue-100"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAmountChange(ticket.id, amounts[ticket.id] + 1)
                                  }}
                                >
                                  <Plus className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                              <span className="text-sm text-gray-600 mx-2">x{ticket.price}</span>
                              <span className="text-sm font-semibold text-blue-700">
                                {((amounts[ticket.id] || 0) * ticket.price).toFixed(0)}฿
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(ticket.id)
                                }}
                                className="ml-auto text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div variants={fadeSlideIn} className="text-center text-gray-500 py-8 text-sm">
                ไม่มีรายการ
              </motion.div>
            )}
          </motion.div>
        </ScrollArea>
      </div>

      {/* Checkbox and Quick Amounts */}
      <motion.div variants={fadeSlideIn} className="p-4 border-t bg-white shadow-sm">
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="apply-all"
              checked={applyToAll}
              onCheckedChange={() => {
                setApplyToAll(!applyToAll)
                setCustomAmount("")
              }}
              className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="apply-all" className="text-sm font-medium text-blue-800 cursor-pointer">
              เลือกแก้ไขราคาทั้งหมด
            </Label>
          </div>
        </div>

        <AnimatePresence>
          {applyToAll && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={fadeSlideIn}
              className="flex justify-center mb-4"
            >
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="w-28 p-2 text-sm text-center bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="จำนวน"
                min="0"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerContainer} className="flex justify-center flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <motion.div key={amount} variants={fadeSlideIn}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                disabled={!applyToAll && !selectedTicketId}
                className="text-sm px-4 py-1 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {amount}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div variants={fadeSlideIn} className="flex justify-between items-center border-t p-4 bg-white shadow-sm">
        <div className="flex items-center">
          <span className="text-sm font-medium text-blue-800">รวมทั้งสิ้น</span>
          <motion.span
            key={total}
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-base font-semibold text-blue-600 ml-2"
          >
            {total.toFixed(0)} บาท
          </motion.span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="text-sm text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            ย้อนกลับ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || total <= 0}
            className="text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "กำลังดำเนินการ..." : "ยืนยัน"}
          </Button>
        </div>
      </motion.div>

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-lg bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-800">ยืนยันการซื้อ</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              คุณต้องการซื้อ {tickets.length} รายการ ({ticketName || "ไม่ระบุชื่อผู้ซื้อ"}, {ticketNumber}) รวม {total.toFixed(2)}{" "}
              บาท?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="text-sm text-gray-700 border-gray-300 hover:bg-gray-100 rounded-lg"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmPurchase}
              disabled={isLoading}
              className="text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isLoading ? "กำลังดำเนินการ..." : "สั่งซื้อ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Balance Modal */}
      <Dialog open={showInsufficientModal} onOpenChange={setShowInsufficientModal}>
        <DialogContent className="sm:max-w-md rounded-lg bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-800">เครดิตไม่เพียงพอ</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              ยอดเครดิตของคุณ ({balance.toFixed(2)} บาท) ไม่เพียงพอสำหรับการซื้อ {total.toFixed(0)} บาท กรุณาเติมเครดิต
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientModal(false)}
              className="text-sm text-gray-700 border-gray-300 hover:bg-gray-100 rounded-lg"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientModal(false)
                router.push("/ticketpurchases")
              }}
              className="text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ไปเติมเครดิต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}