"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ArrowLeft, RotateCcw, Home } from "lucide-react"
import NumberSets from "./number-sets"
import type { Ticket, TicketSubType } from "@/types/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface NumberPadProps {
  maxDigits?: number
  onSubmit?: (data: { number: string; type: TicketSubType; price: number }) => void
  onSubmitMultiple?: (tickets: Ticket[]) => void
  onComplete?: () => void
  onPriceEntry?: () => void
  selectedNumbers: Set<string>
  setSelectedNumbers: React.Dispatch<React.SetStateAction<Set<string>>>
  selectedType: TicketSubType
  setSelectedType: React.Dispatch<React.SetStateAction<TicketSubType>>
  useReverseNumbers: boolean
  setUseReverseNumbers: React.Dispatch<React.SetStateAction<boolean>>
  activeFilter: number | null
  setActiveFilter: React.Dispatch<React.SetStateAction<number | null>>
  userName?: string
  tickets: Ticket[]
}

type TicketType = "สามตัว" | "สองตัว" | "เลขวิ่ง"

const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const SubTypeButton = ({
  subType,
  isSelected,
  onClick,
  disabled
}: { subType: TicketSubType; isSelected: boolean; onClick: () => void; disabled?: boolean }) => (
  <motion.div variants={fadeInVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.2 }}>
    <Button
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "rounded-full text-sm px-3 py-1 h-auto transition-all w-full",
        isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-muted hover:bg-muted/80",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {subType.type_name} x{subType.multiplication_factor}
    </Button>
  </motion.div>
)

const NumberPad = ({
  maxDigits = 3,
  onSubmit,
  onSubmitMultiple,
  onComplete,
  onPriceEntry,
  selectedNumbers,
  setSelectedNumbers,
  selectedType,
  setSelectedType,
  useReverseNumbers,
  setUseReverseNumbers,
  activeFilter,
  setActiveFilter,
  userName,
  tickets,
}: NumberPadProps) => {
  const [digits, setDigits] = useState("")
  const [selectedTypeTab, setSelectedTypeTab] = useState<TicketType>("สามตัว")
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<TicketSubType>>(new Set())
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [useRandomNumber, setUseRandomNumber] = useState(false)
  const [animateDigitIndex, setAnimateDigitIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"manual" | "sets">("manual")
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!(selectedNumbers instanceof Set)) {
      console.warn("selectedNumbers is not a Set, resetting to new Set")
      setSelectedNumbers(new Set())
    }
  }, [selectedNumbers, setSelectedNumbers])

  useEffect(() => {
    const fetchTicketSubTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_sub_types")
          .select("*")
          .order("type_number", { ascending: true })
          .order("type_name", { ascending: true })

        if (error) throw error

        // Properly map the data to ensure it conforms to TicketSubType interface
        if (data) {
          const typedData: TicketSubType[] = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            type_number: Number(item.type_number || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))

          setTicketSubTypes(typedData)

          if (typedData.length > 0) {
           
            
            setSelectedPrice(typedData[0].multiplication_factor)
          }
        }
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message)
      }
    }
    fetchTicketSubTypes()
  }, [supabase])

  const listboxItems: Record<TicketType, TicketSubType[]> = useMemo(
    () => ({
      สามตัว: ticketSubTypes.filter((t) => t.type_number === 3),
      สองตัว: ticketSubTypes.filter((t) => t.type_number === 2),
      เลขวิ่ง: ticketSubTypes.filter((t) => t.type_number === 1),
    }),
    [ticketSubTypes],
  )

  const currentMaxDigits = useMemo(() => {
    return selectedTypeTab === "เลขวิ่ง" ? 1 : selectedTypeTab === "สองตัว" ? 2 : 3
  }, [selectedTypeTab])

  const subTypeList = useMemo(() => listboxItems[selectedTypeTab], [selectedTypeTab, listboxItems])

  useEffect(() => {
    setDigits("")
    setSelectedSubTypes(new Set())
    setSelectedPrice(null)
  }, [maxDigits, selectedTypeTab])

  useEffect(() => {
    if (digits.length === currentMaxDigits && selectedPrice && selectedSubTypes.size > 0 && onSubmit) {
      handleSubmit()
    }
  }, [digits, selectedPrice, selectedSubTypes, currentMaxDigits])

  const handleDigit = (digit: string) => {
    if (digits.length < currentMaxDigits) {
      setAnimateDigitIndex(digits.length)
      setDigits((prev) => prev + digit)
    }
  }

  const handleDelete = () => setDigits((prev) => prev.slice(0, -1))

  const handleClear = () => setDigits("")

  const handleSubmit = () => {
    if (
      digits.length !== currentMaxDigits ||
      !selectedPrice ||
      selectedSubTypes.size === 0
    ) {
      toast.error("กรุณาเลือกประเภทและกรอกเลขให้ครบถ้วน");
      return;
    }
    if (digits.length === currentMaxDigits && selectedPrice && selectedSubTypes.size > 0 && onSubmit) {
      const isDuplicate = tickets.some(
        t => t.number === digits && Array.from(selectedSubTypes).some(st => st.id === t.type_id)
      )
      if (isDuplicate) {
        toast.error('เลขนี้ในประเภทนี้มีอยู่แล้ว');
        return;
      }
      // Create tickets for each selected subtype
      const newTickets: Ticket[] = Array.from(selectedSubTypes).map(subType => ({
        id: crypto.randomUUID(),
        number: digits,
        type_id: subType.id,
        price: subType.multiplication_factor,
        name: userName || "Unnamed Ticket",
        ticketNumber: digits
      }))

      if (onSubmitMultiple) {
        onSubmitMultiple(newTickets)
      } else {
        // If not multi-select, only use the first selected subtype
        const firstSubType = Array.from(selectedSubTypes)[0]
        onSubmit({ number: digits, type: firstSubType, price: selectedPrice })
      }

      // Handle reverse numbers for two-digit tickets
      if (useRandomNumber && currentMaxDigits === 2) {
        const reversed = digits.split("").reverse().join("")
        if (reversed !== digits) {
          const reversedTickets = Array.from(selectedSubTypes).map(subType => ({
            id: crypto.randomUUID(),
            number: reversed,
            type_id: subType.id,
            price: subType.multiplication_factor,
            name: userName || "Unnamed Ticket",
            ticketNumber: reversed
          }))
          if (onSubmitMultiple) {
            onSubmitMultiple(reversedTickets)
          }
        }
      }

      setDigits("")
      setSelectedPrice(null)
      setSelectedSubTypes(new Set())
      setUseRandomNumber(false)
    }
  }

  const handleMultipleSubmit = useCallback(
    (tickets: Ticket[]) => {
      if (onSubmitMultiple) {
        onSubmitMultiple(tickets)
      }
    },
    [onSubmitMultiple],
  )

  const handleSubTypeSelect = useCallback(
    (subType: TicketSubType) => {
      setSelectedSubTypes((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(subType)) {
          newSet.delete(subType)
        } else {
          // If not multi-select, clear previous selections
          if (!onSubmitMultiple) {
            newSet.clear()
          }
          newSet.add(subType)
        }
        return newSet
      })
      setSelectedPrice(subType.multiplication_factor)
     
    },
    [onSubmitMultiple],
  )

  const handleTypeChange = useCallback((type: TicketType) => {
    setSelectedTypeTab(type)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value as "manual" | "sets")
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full flex flex-col p-4 gap-4 pb-[60px] md:pb-4 bg-background rounded-lg shadow-sm border"
    >
      <Tabs defaultValue="manual" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-2 mb-2">
          <TabsTrigger value="manual">กดเลือกเอง</TabsTrigger>
          <TabsTrigger value="sets">ชุดตัวเลข</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-0">
          <motion.div className="flex border-b mb-3" variants={staggerContainer} initial="hidden" animate="visible">
            {(["สามตัว", "สองตัว", "เลขวิ่ง"] as TicketType[]).map((type) => (
              <motion.div key={type} variants={fadeInVariants} className="flex-1">
                <Button
                  variant={selectedTypeTab === type ? "default" : "ghost"}
                  onClick={() => handleTypeChange(type)}
                  className="w-full text-sm font-medium"
                >
                  {type}
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {currentMaxDigits === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-2"
            >
              <Checkbox
                id="reverse-number"
                checked={useRandomNumber}
                onCheckedChange={() => setUseRandomNumber(!useRandomNumber)}
              />
              <Label htmlFor="reverse-number" className="text-sm cursor-pointer">
                กลับเลข
              </Label>
            </motion.div>
          )}

          <motion.div className="grid grid-cols-2 gap-2" variants={staggerContainer} initial="hidden" animate="visible">
            {subTypeList.map((subType) => {
              const isDuplicate = digits.length === currentMaxDigits && tickets.some(
                t => t.number === digits && t.type_id === subType.id
              )
              return (
                <SubTypeButton
                  key={subType.id}
                  subType={subType}
                  isSelected={Array.from(selectedSubTypes).some(st => st.id === subType.id)}
                  onClick={() => handleSubTypeSelect(subType)}
                  disabled={isDuplicate}
                />
              )
            })}
          </motion.div>

          <motion.div
            className="flex justify-center gap-3 my-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {[...Array(currentMaxDigits)].map((_, i) => (
              <AnimatePresence key={i} mode="wait">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: animateDigitIndex === i ? [0, -5, 0] : 0,
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    y: { duration: 0.2 },
                  }}
                  className="w-12 h-12 border rounded-lg bg-muted/50 flex items-center justify-center text-xl font-medium shadow-sm"
                >
                  {digits[i] || ""}
                </motion.div>
              </AnimatePresence>
            ))}
          </motion.div>

          <motion.div className="grid grid-cols-3 gap-2" variants={staggerContainer} initial="hidden" animate="visible">
            {[..."123456789"].map((n) => (
              <motion.div key={n} variants={fadeInVariants}>
                <Button
                  onClick={() => handleDigit(n)}
                  variant="outline"
                  className="text-base w-full h-12 hover:bg-primary/10"
                >
                  {n}
                </Button>
              </motion.div>
            ))}
            <motion.div variants={fadeInVariants}>
              <Button
                onClick={handleClear}
                variant="outline"
                className="text-base w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                ลบ
              </Button>
            </motion.div>
            <motion.div variants={fadeInVariants}>
              <Button onClick={() => handleDigit("0")} variant="outline" className="text-base w-full h-12">
                0
              </Button>
            </motion.div>
            <motion.div variants={fadeInVariants}>
              <Button
                onClick={handleDelete}
                variant="outline"
                className="text-base w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </TabsContent>

        <TabsContent value="sets" className="mt-0">
          <NumberSets
            onSubmit={handleMultipleSubmit}
            selectedNumbers={selectedNumbers}
            setSelectedNumbers={setSelectedNumbers}
            useReverseNumbers={useReverseNumbers}
            setUseReverseNumbers={setUseReverseNumbers}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            userName={userName}
            tickets={tickets}
          />
        </TabsContent>
      </Tabs>

      <motion.div
        className="mt-auto hidden md:flex items-center border-t pt-3 gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Button variant="ghost" className="flex-1 text-sm text-muted-foreground">
          <Home className="h-4 w-4 mr-2" />
          กลับหน้าหลัก
        </Button>
        <Button onClick={onPriceEntry} className="flex-1 text-sm">
          ใส่ราคา
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default NumberPad
