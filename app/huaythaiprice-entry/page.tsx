"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Trash2, ArrowLeft, Plus, Minus, Bitcoin } from "lucide-react"
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
import { format, addMonths, isBefore, isAfter, set } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { th } from "date-fns/locale"
import { handlePrint } from "@/lib/lottery-print"
// Define interfaces for the parsed JSON data
interface NumberSetsState {
  selectedNumbers: string[]
  selectedType: TicketSubType
  useReverseNumbers: boolean
  activeFilter: number | null
}

interface TicketResult {
  id: string
  result_date: string
  ticket_sub_type_id: string
  user_id: string
  created_at: string
}

interface PurchaseData {
  id: string
  transaction_id: string
  user_id: string
  ticket_set_name: string | null
  ticket_set_number: string
  created_at: string
  purchase_date: string
  ticket_result_id: string
}

interface BalanceData {
  balance: number
  user_id: string
  updated_at: string
}

interface TransactionData {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  description: string
  created_at: string
}

// Animation variants
const fadeSlideIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
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
  // const minutes = thailandTime.getMinutes() // Not used in logic, can be removed

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
    day > 16 ||
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

  const formattedDrawDateForQuery = format(drawDate, "yyyy-MM-dd")

  // Query the lottery_draw_dates table for the next draw date
  const { data: drawDates, error: drawError } = await supabase
    .from("lottery_draw_dates")
    .select("draw_date")
    .gte("draw_date", format(thailandTime, "yyyy-MM-dd"))
    .order("draw_date", { ascending: true })
    .limit(1)
    .single()

  if (drawError && drawError.code !== "PGRST116") {
    // PGRST116 means "No rows found", which is handled below.
    // Other errors should be thrown.
    throw new Error(`Error fetching draw date: ${drawError.message}`)
  }

  if (drawDates) {
    return drawDates.draw_date
  }

  // If no draw date is found, insert the calculated draw date
  const { error: insertError } = await supabase.from("lottery_draw_dates").insert({ draw_date: formattedDrawDateForQuery })

  if (insertError) {
    throw new Error(`Error inserting draw date: ${insertError.message}`)
  }

  return formattedDrawDateForQuery
}

export default function PriceEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const sessionId = searchParams.get("sessionId")

  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [tickets, setTickets] = useState<Ticket[]>([]) // This will hold the actual tickets being displayed and edited
  const [amounts, setAmounts] = useState<{ [key: string]: number }>({})
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
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<TicketSubType>({
    id: "",
    type_name: "สามตัวบน",
    type_number: 3,
    multiplication_factor: 900,
  })
  const [useReverseNumbers, setUseReverseNumbers] = useState<boolean>(false)
  const [activeFilter, setActiveFilter] = useState<number | null>(null)
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const [formattedDrawDate, setFormattedDrawDate] = useState<string>("")


  // 1. Load data from localStorage on component mount
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      try {
        const data = JSON.parse(localStorage.getItem(`priceEntry_${sessionId}`) || '{}');

        if (data.tickets && data.tickets.length > 0) {
          setTickets(data.tickets);
          // Initialize amounts for each ticket, defaulting to 1 if not present
          const initialAmounts = data.tickets.reduce((acc: { [key: string]: number }, ticket: Ticket) => {
            acc[ticket.id] = 1; // Default amount
            return acc;
          }, {});
          setAmounts(initialAmounts);
        }

        if (data.numberSetsState) {
          const nsState = data.numberSetsState;
          setSelectedNumbers(nsState.selectedNumbers || []);
          setSelectedType(nsState.selectedType || { id: "", type_name: "สามตัวบน", type_number: 3, multiplication_factor: 900 });
          setUseReverseNumbers(nsState.useReverseNumbers ?? false);
          setActiveFilter(nsState.activeFilter ?? null);
        }

        // Clean up localStorage after retrieving data
        localStorage.removeItem(`priceEntry_${sessionId}`);
      } catch (e) {
        console.error("Failed to parse data from localStorage", e);
        toast.error("ไม่สามารถโหลดข้อมูลรายการได้");
      }
    }
  }, [sessionId]); // Depend on sessionId so it only runs when sessionId is available


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
  // const purchaseDate = format(thailandTime, "yyyy-MM-dd", { locale: th }) // purchaseDate is not used outside of confirmPurchase, can be defined locally there if needed

  // Fetch draw date for display
  useEffect(() => {
    const fetchDrawDate = async () => {
      try {
        const drawDate = await getNextDrawDate(supabase, thailandTime)
        const formatted = format(new Date(drawDate), "วันที่ d MMMM yyyy", { locale: th })
        setFormattedDrawDate(formatted)
      } catch (err: any) {
        toast.error("ไม่สามารถโหลลดวันที่หวยออกได้: " + err.message)
      }
    }
    fetchDrawDate()
  }, [supabase, thailandTime])

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
          const typedData = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            type_number: Number(item.type_number || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
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
  const updateTicketInfo = useCallback(
    (newName: string, newNumber: string) => {
      // This function should probably update something on the server or a global state,
      // not internal `tickets` state which is derived from `allTickets` (now `tickets`).
      // If it's meant to update only the name/number for display purposes, then `setTicketName` and `setTicketNumber` are sufficient.
      // Re-evaluating this based on the original intent: if this is meant to update the *current batch* of tickets
      // before going back to the previous page, then the logic within handleBack is probably what's needed.
      // For now, it just sets the local state for name and number.
      setTicketName(newName);
      setTicketNumber(newNumber);
    },
    [], // No dependencies as it just sets local state
  );

  // Debounce ticket name updates to prevent rapid state changes
  const debouncedUpdateTicketName = useCallback(
    debounce((newName: string) => {
      setTicketName(newName);
    }, 300),
    [], // No dependencies as it just sets local state
  );

  // Handle ticket name change with debouncing
  const handleTicketNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value
      setTicketName(newName) // Update immediately for responsive UI
      debouncedUpdateTicketName(newName) // Debounced update for potential side effects if needed later
    },
    [debouncedUpdateTicketName],
  )

  // Memoize the grouped tickets calculation
  const groupedTickets = useMemo(() => {
    return ticketSubTypes.reduce(
      (acc, subType) => {
        const filtered = tickets.filter((t) => t.type_id === subType.id)
        if (filtered.length > 0) {
          acc[subType.type_name] = filtered
        }
        return acc
      },
      {} as Record<string, Ticket[]>,
    )
  }, [tickets, ticketSubTypes])

  const total = useMemo(() => {
    // Calculate total based on amounts and ticket prices
    return tickets.reduce((sum, ticket) => {
      const amount = amounts[ticket.id] || 0;
      return sum + amount ;
    }, 0);
  }, [amounts, tickets]);

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
          if (payload.new && typeof payload.new.balance === "number") {
            setBalance(payload.new.balance)
          }
        },
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

  const handleQuickAmount = useCallback(
    (amount: number) => {
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
        setSelectedTicketId(null) // Deselect after applying quick amount to a single ticket
      }
    },
    [applyToAll, selectedTicketId, tickets],
  )

  const handleCustomAmountChange = useCallback(
    (value: string) => {
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
    },
    [applyToAll, tickets],
  )

  const handleDelete = useCallback(
    (ticketId: string) => {
      setAmounts((prev) => {
        const newAmounts = { ...prev }
        delete newAmounts[ticketId]
        return newAmounts
      })

      const remainingTickets = tickets.filter((ticket) => ticket.id !== ticketId)
      setTickets(remainingTickets)

      if (remainingTickets.length === 0) {
        // If all tickets are deleted, navigate back with empty data
        const params = new URLSearchParams()
        params.set("allTickets", JSON.stringify([]))
        // Pass back the current numberSetsState so it doesn't reset on the previous page
        params.set("numberSetsState", JSON.stringify({
          selectedNumbers,
          selectedType,
          useReverseNumbers,
          activeFilter,
        }));
        router.push(`/huaythai?${params.toString()}`)
      }
    },
    [tickets, selectedNumbers, selectedType, useReverseNumbers, activeFilter, router],
  )

  const handleConfirm = useCallback(() => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ")
      return
    }

    if (tickets.length === 0) {
      toast.error("ไม่มีรายการตั๋วให้ซื้อ")
      return
    }

    if (total <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่มากกว่า 0")
      return
    }

    if (total > balance) {
      setShowInsufficientModal(true)
      return
    }

    // Show confirmation modal
    setShowConfirmModal(true)
  }, [user, tickets.length, total, balance])

  const confirmPurchase = useCallback(async () => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ")
      return
    }

    setIsLoading(true)
    setShowConfirmModal(false)

    try {
      const thailandTime = getThailandTime()
      const purchaseDate = format(thailandTime, "yyyy-MM-dd", { locale: th })
      const drawDate = await getNextDrawDate(supabase, thailandTime)

      if (total > balance) {
        throw new Error("ยอดเงินไม่เพียงพอ")
      }

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
            .single()

          if (insertError || !newResult?.id) {
            throw new Error(`Failed to create ticket result for type ID ${typeId}: ${insertError?.message || 'Unknown error'}`)
          }
          ticketResultIds[typeId] = String(newResult.id)
        } else if (resultError) {
          throw new Error(`Error fetching existing ticket result for type ID ${typeId}: ${resultError.message}`)
        } else if (resultData?.id) {
          ticketResultIds[typeId] = String(resultData.id)
        }
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

      if (transactionError || !transactionData?.id) {
        throw new Error("Failed to create transaction record")
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
        throw new Error("Failed to update balance")
      }

      const purchaseIds: { [typeId: string]: string } = {}
      for (const typeId of uniqueTypeIds) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from("ticket_purchases")
          .insert({
            transaction_id: transactionData.id,
            user_id: user.id,
            ticket_set_name: ticketName || null,
            ticket_set_number: ticketNumber,
            created_at: thailandTime.toISOString(),
            purchase_date: purchaseDate,
            ticket_result_id: ticketResultIds[typeId],
          })
          .select("id")
          .single()

        if (purchaseError || !purchaseData?.id) {
          throw new Error("Failed to create purchase record")
        }
        purchaseIds[typeId] = String(purchaseData.id)
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

      const { error: ticketItemError } = await supabase
        .from("ticket_purchase_items")
        .insert(ticketPurchaseItems)

      if (ticketItemError) {
        throw new Error("Failed to create purchase items")
      }

      if (balanceData && typeof balanceData.balance === 'number') {
        setBalance(balanceData.balance)
      }

      toast.success(`ซื้อตั๋ว ${total.toFixed(0)} บาทสำเร็จ!`)

      // Create purchase object for printing
      const purchaseForPrint = {
        id: purchaseIds[Object.keys(purchaseIds)[0]], // Use the first purchase ID
        ticket_set_name: ticketName || null,
        ticket_set_number: ticketNumber,
        purchase_date: purchaseDate,
        items: ticketPurchaseItems.map(item => ({
          ...item,
          sub_type_name: ticketSubTypes.find(type => type.id === item.ticket_sub_type_id)?.type_name || "ไม่ทราบประเภท"
        }))
      };
      // Call print function
       

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
    } catch (err: any) {
      console.error("Error confirming purchase:", err)
      toast.error(err.message || "เกิดข้อผิดพลาดในการซื้อตั๋ว")
    } finally {
      setIsLoading(false)
    }
  }, [user, tickets, amounts, balance, ticketName, ticketNumber, total, supabase, router, selectedNumbers, selectedType, useReverseNumbers, activeFilter, ticketSubTypes])

  const handleBack = useCallback(() => {
    // Create URL parameters with all necessary data
    const params = new URLSearchParams();
    
    // Pass back the current numberSetsState
    params.set("numberSetsState", JSON.stringify({
      selectedNumbers,
      selectedType,
      useReverseNumbers,
      activeFilter,
    }));

    // Pass back the current tickets
    params.set("tickets", JSON.stringify(tickets));

    // Navigate back to huaythai page with all data in URL parameters
    router.push(`/huaythai?${params.toString()}`);
  }, [
    router,
    tickets,
    selectedNumbers,
    selectedType,
    useReverseNumbers,
    activeFilter,
  ]);

  const activeTicketTypes = Object.keys(groupedTickets)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-sans"
    >
      {/* Header */}
      <motion.div
        variants={fadeSlideIn}
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 text-white shadow-md"
      >
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">ระบุจำนวนเงิน</h1>
            <span className="text-sm text-blue-100/90">งวด{formattedDrawDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-[10px] text-blue-100/90 animate-pulse">กำลังโหลด...</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white/90">{user?.user_metadata?.name || "Guest"}</span>
                <span className="text-lg text-white flex items-center font-bold">
                  <Bitcoin className="w-2.5 h-2.5 mr-0.5 text-white" />
                  {balance.toFixed(0)} บาท
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTopUp(!showTopUp)}
                className="h-6 px-2 text-[10px] text-white/90 border-blue-400/30 bg-blue-500/10 hover:bg-blue-400/20 hover:text-white transition-all duration-200 rounded-md"
              >
                เติมเงิน
              </Button>
            </div>
          )}
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
            className="p-2 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border-b border-blue-100/50"
          >
            <div className="flex items-center gap-2 max-w-xs mx-auto">
              <Input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="h-7 w-full text-xs text-center bg-white/80 border-blue-200/50 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="จำนวนเงิน (ขั้นต่ำ 10 บาท)"
                min="10"
              />
              <Button
                onClick={handleTopUp}
                disabled={isLoading || topUpAmount === "" || isNaN(Number(topUpAmount)) || Number(topUpAmount) < 10}
                className="h-7 px-3 text-xs bg-gradient-to-r from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 rounded-md"
              >
                {isLoading ? "กำลังดำเนินการ..." : "เติม"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Name and Number Section */}
      <motion.div variants={fadeSlideIn} className="p-2 sm:p-3 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex flex-row items-center gap-2 sm:gap-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 min-w-[120px]">
            <Label htmlFor="ticket-name" className="text-xs font-medium text-gray-700 whitespace-nowrap">
              ชื่อรายการ
            </Label>
            <Input
              id="ticket-name"
              type="text"
              value={ticketName}
              required
              onChange={handleTicketNameChange}
              className="w-full p-1 text-xs bg-white border-gray-200 rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="ชื่อผู้ซื้อ"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">เลขตั๋ว</Label>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-lg">
              {ticketNumber}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Ticket List */}
      <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <motion.div variants={staggerContainer} className="flex flex-col space-y-2 sm:space-y-3 p-2 sm:p-3">
            {activeTicketTypes.length > 0 ? (
              activeTicketTypes.map((typeName) => (
                <motion.div key={typeName} variants={fadeSlideIn}>
                  <Card className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg overflow-hidden border border-gray-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-blue-800 text-sm">{typeName}</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
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
                              className={`flex items-center px-2 sm:px-3 py-1.5 border-b border-gray-100 hover:bg-blue-50/50 transition-all duration-200 ${
                                selectedTicketId === ticket.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => setSelectedTicketId(ticket.id)}
                            >
                              <div className="flex items-center gap-1.5 min-w-[120px]">
                                <span className="text-xs text-gray-500 w-4 font-medium">{index + 1}.</span>
                                <div className="flex space-x-0.5">
                                  {ticket.number.split("").map((digit, i) => (
                                    <motion.span
                                      key={i}
                                      initial={{ scale: 0.9 }}
                                      animate={{ scale: 1 }}
                                      className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-b from-blue-100 to-blue-200 rounded flex items-center justify-center text-xs font-semibold text-blue-800 shadow-sm"
                                    >
                                      {digit}
                                    </motion.span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-1 justify-end">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-gray-200 hover:bg-blue-100 transition-all duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAmountChange(ticket.id, Math.max(0, amounts[ticket.id] - 1))
                                    }}
                                  >
                                    <Minus className="h-2.5 w-2.5 text-blue-600" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={amounts[ticket.id] || ""}
                                    onChange={(e) => handleAmountChange(ticket.id, Number(e.target.value))}
                                    className="w-12 sm:w-14 h-5 sm:h-6 p-0 text-xs text-center bg-white border-gray-200 rounded shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="0"
                                    min="0"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-gray-200 hover:bg-blue-100 transition-all duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAmountChange(ticket.id, amounts[ticket.id] + 1)
                                    }}
                                  >
                                    <Plus className="h-2.5 w-2.5 text-blue-600" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500">x{ticket.price}</span>
                                  <span className="text-xs font-semibold text-blue-700 min-w-[40px] text-right">
                                    {((amounts[ticket.id] || 0) * ticket.price).toFixed(0)}฿
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(ticket.id)
                                    }}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-all duration-200"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div variants={fadeSlideIn} className="text-center text-gray-500 py-4 text-xs">
                ไม่มีรายการ
              </motion.div>
            )}
          </motion.div>
        </ScrollArea>
      </div>

      {/* Checkbox and Quick Amounts */}
      <motion.div variants={fadeSlideIn} className="p-2 border-t bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center mb-1">
          <div className="flex items-center space-x-1">
            <Checkbox
              id="apply-all"
              checked={applyToAll}
              onCheckedChange={() => {
                setApplyToAll(!applyToAll)
                setCustomAmount("")
              }}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 rounded"
            />
            <Label htmlFor="apply-all" className="text-xs font-medium text-gray-700 cursor-pointer">
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
              className="flex justify-center mb-2"
            >
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="w-24 p-1 text-xs text-center bg-white border-gray-200 rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="จำนวน"
                min="0"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerContainer} className="flex justify-center flex-wrap gap-1">
          {quickAmounts.map((amount) => (
            <motion.div key={amount} variants={fadeSlideIn}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                disabled={!applyToAll && !selectedTicketId}
                className="text-xs px-2 py-1 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200"
              >
                {amount}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div 
        variants={fadeSlideIn} 
        className="sticky bottom-0 left-0 right-0 flex flex-col sm:flex-row justify-between items-center border-t p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-sm gap-4 sm:gap-0 z-50"
        role="contentinfo"
        aria-label="Footer with total amount and action buttons"
      >
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700">รวมทั้งสิ้น</span>
          <motion.span
            key={total}
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg sm:text-xl font-bold text-blue-600 ml-3"
            aria-live="polite"
          >
            {total.toFixed(0)} บาท
          </motion.span>
        </div>
        <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 sm:flex-none text-sm text-gray-700 border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 px-4 sm:px-6"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            ย้อนกลับ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || total <= 0}
            className="flex-1 sm:flex-none text-sm bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg hover:from-indigo-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 px-4 sm:px-8"
            aria-label={isLoading ? "กำลังดำเนินการ" : "ยืนยัน"}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                กำลังดำเนินการ...
              </>
            ) : (
              "ยืนยัน"
            )}
          </Button>
        </div>
      </motion.div>

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white shadow-xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">ยืนยันการซื้อ</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              คุณต้องการซื้อ {tickets.length} รายการ ({ticketName || "ไม่ระบุชื่อผู้ซื้อ"}, {ticketNumber}) รวม {total.toFixed(2)} บาท?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-3 sm:justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="text-sm text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmPurchase}
              disabled={isLoading}
              className="text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-all duration-200 px-6"
            >
              {isLoading ? "กำลังดำเนินการ..." : "สั่งซื้อ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Balance Modal */}
      <Dialog open={showInsufficientModal} onOpenChange={setShowInsufficientModal}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white shadow-xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">เครดิตไม่เพียงพอ</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              ยอดเครดิตของคุณ ({balance.toFixed(2)} บาท) ไม่เพียงพอสำหรับการซื้อ {total.toFixed(0)} บาท กรุณาเติมเครดิต
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-3 sm:justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientModal(false)}
              className="text-sm text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientModal(false)
                router.push("/ticketpurchases")
              }}
              className="text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 px-6"
            >
              ไปเติมเครดิต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}