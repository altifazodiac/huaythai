"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { Ticket, TicketSubType } from "@/types/types"
import { useTicketSubTypes } from "@/components/contexts/TicketSubTypeContext"

interface NumberSetsProps {
  onSubmit?: (tickets: Ticket[]) => void
  selectedNumbers: Set<string>
  setSelectedNumbers: React.Dispatch<React.SetStateAction<Set<string>>>
  useReverseNumbers: boolean
  setUseReverseNumbers: React.Dispatch<React.SetStateAction<boolean>>
  activeFilter: number | null
  setActiveFilter: React.Dispatch<React.SetStateAction<number | null>>
  userName?: string
  tickets: Ticket[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.01, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

const filterVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}
 

type TicketType = "สามตัว" | "สองตัว" | "เลขวิ่ง"

const NumberSets = ({
  onSubmit,
  selectedNumbers,
  setSelectedNumbers,
  useReverseNumbers,
  setUseReverseNumbers,
  activeFilter,
  setActiveFilter,
  userName = "Unknown User",
  tickets,
}: NumberSetsProps) => {
  const [visibleNumbers, setVisibleNumbers] = useState<string[]>([])
  const ticketSubTypes = useTicketSubTypes()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<Set<TicketSubType>>(new Set())
  const [selectedTypeTab, setSelectedTypeTab] = useState<TicketType>("สามตัว")
  const scrollTimeout = useRef<number | null>(null)
  const supabase = createClient()

  const allThreeDigitNumbers = useMemo(() => Array.from({ length: 1000 }, (_, i) => i.toString().padStart(3, "0")), [])
  const allTwoDigitNumbers = useMemo(() => Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0")), [])
  const allOneDigitNumbers = useMemo(() => Array.from({ length: 10 }, (_, i) => i.toString()), [])

  const listboxItems: Record<TicketType, TicketSubType[]> = useMemo(
    () => ({
      สามตัว: ticketSubTypes.filter((t) => t.type_name.includes("สามตัว")),
      สองตัว: ticketSubTypes.filter((t) => t.type_name.includes("สองตัว")),
      เลขวิ่ง: ticketSubTypes.filter((t) => t.type_name.includes("วิ่ง")),
    }),
    [ticketSubTypes],
  )

  const currentMaxDigits = useMemo(() => {
    return selectedTypeTab === "เลขวิ่ง" ? 1 : selectedTypeTab === "สองตัว" ? 2 : 3
  }, [selectedTypeTab])

  const filteredNumbers = useMemo(() => {
    if (selectedTypeTab === "สามตัว") {
      return activeFilter !== null
        ? allThreeDigitNumbers.filter((num) => {
            const filterStr = activeFilter.toString().padStart(3, "0").substring(0, 1)
            return num.startsWith(filterStr)
          })
        : allThreeDigitNumbers.slice(0, 100)
    }
    if (selectedTypeTab === "สองตัว") return allTwoDigitNumbers
    if (selectedTypeTab === "เลขวิ่ง") return allOneDigitNumbers
    return []
  }, [selectedTypeTab, activeFilter, allThreeDigitNumbers, allTwoDigitNumbers, allOneDigitNumbers])

  useEffect(() => {
    if (!(selectedNumbers instanceof Set)) {
      console.warn("selectedNumbers is not a Set, resetting to new Set")
      setSelectedNumbers(new Set())
    }
  }, [selectedNumbers, setSelectedNumbers])

  const updateSelectedNumbersWithReverse = useCallback(() => {
    if (!selectedTypeTab.includes("สองตัว")) return

    setSelectedNumbers((prev) => {
      if (!(prev instanceof Set)) {
        console.warn("prev is not a Set, returning new Set")
        return new Set()
      }
      const updated = new Set(prev)
      let hasChanges = false

      if (useReverseNumbers) {
        prev.forEach((number) => {
          const reversed = number.split("").reverse().join("")
          if (reversed !== number && !updated.has(reversed)) {
            updated.add(reversed)
            hasChanges = true
          }
        })
      } else {
        const numbersToRemove: string[] = []
        for (const number of prev) {
          const reversed = number.split("").reverse().join("")
          if (prev.has(reversed) && number > reversed && updated.has(number)) {
            numbersToRemove.push(number)
            hasChanges = true
          }
        }
        numbersToRemove.forEach((num) => updated.delete(num))
      }

      return hasChanges ? updated : prev
    })
  }, [useReverseNumbers, selectedTypeTab, setSelectedNumbers])

  useEffect(() => {
    if (selectedTypeTab.includes("สองตัว")) {
      updateSelectedNumbersWithReverse()
    }
  }, [useReverseNumbers, selectedTypeTab, updateSelectedNumbersWithReverse])

  useEffect(() => {
    const fetchTicketSubTypes = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("ticket_sub_types")
          .select("*")
          .order("type_number", { ascending: true })
          .order("type_name", { ascending: true })

        if (error) throw error

        if (data) {
          // Properly map the data to ensure it conforms to TicketSubType interface
          const typedData: TicketSubType[] = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            type_number: Number(item.type_number || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))

          // Filter for valid types based on type_number
          // (No longer set selectedType or selectedTypes automatically)
          // const validTypes = typedData.filter((type) => type.type_number >= 1 && type.type_number <= 3)
        }
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTicketSubTypes()
  }, [supabase])

  useEffect(() => {
    if (filteredNumbers.length > 0) {
      setVisibleNumbers(filteredNumbers.slice(0, 100))
    }
  }, [filteredNumbers])

  const handleNumberToggle = useCallback(
    (number: string) => {
      setSelectedNumbers((prev) => {
        if (!(prev instanceof Set)) {
          console.warn("prev is not a Set, returning new Set")
          return new Set([number])
        }
        const updated = new Set(prev)
        if (updated.has(number)) updated.delete(number)
        else updated.add(number)

        if (selectedTypeTab.includes("สองตัว") && useReverseNumbers) {
          const reversed = number.split("").reverse().join("")
          if (updated.has(number)) updated.add(reversed)
          else updated.delete(reversed)
        }
        return updated
      })
    },
    [useReverseNumbers, selectedTypeTab, setSelectedNumbers],
  )

  const handleTypeTabChange = (type: TicketType) => {
    setSelectedTypeTab(type)
    setSelectedNumbers(new Set())
    setActiveFilter(null)
    setUseReverseNumbers(false)
    setSelectedTypes(new Set())
  }

  const handleTypeSelect = (subType: TicketSubType) => {
    setSelectedTypes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(subType)) {
        newSet.delete(subType)
      } else {
        // Allow selecting multiple subtypes from the same category
        const sameCategoryTypes = Array.from(newSet).filter(t => 
          (t.type_number === 3 && subType.type_number === 3) || // สามตัว
          (t.type_number === 2 && subType.type_number === 2) || // สองตัว
          (t.type_number === 1 && subType.type_number === 1)    // เลขวิ่ง
        )
        
        // If selecting a different category, clear previous selections
        if (sameCategoryTypes.length === 0) {
          newSet.clear()
        }
        newSet.add(subType)
      }
      return newSet
    })
    setSelectedNumbers(new Set())
    setActiveFilter(null)
    setUseReverseNumbers(false)
  }

  const handleFilterSelect = (filter: number | null) => {
    setActiveFilter(filter === activeFilter ? null : filter)
  }

  const handleSubmit = async () => {
    if (selectedTypes.size === 0) {
      toast.error("กรุณาเลือกประเภทก่อนเพิ่มรายการ")
      return
    }

    // Validate all numbers for all selected types
    const invalidNumbers = Array.from(selectedTypes).flatMap(type =>
      Array.from(selectedNumbers).filter(num => num.length !== (type.type_number === 3 ? 3 : type.type_number === 2 ? 2 : 1))
    )
    
    if (invalidNumbers.length > 0) {
      toast.error("กรุณาเลือกเลขให้ตรงกับจำนวนหลักของประเภทที่เลือก")
      return
    }

    if (selectedNumbers.size && onSubmit) {
      setIsSubmitting(true)
      try {
        const tickets: Ticket[] = []
        const ticketSet = new Set<string>()
        const duplicateNumbers = new Set<string>()
        
        // Create tickets for each selected number and type combination
        Array.from(selectedTypes).forEach(type => {
          Array.from(selectedNumbers).forEach(number => {
            if (number.length === (type.type_number === 3 ? 3 : type.type_number === 2 ? 2 : 1)) {
              // Check for duplicates
              const key = `${number}-${type.id}`
              if (ticketSet.has(key)) {
                duplicateNumbers.add(number)
                return
              }
              
              // เลขปกติ
              tickets.push({
                id: uuidv4(),
                number,
                type_id: type.id,
                price: type.multiplication_factor,
                amount: 1,
                name: userName,
                ticketNumber: number,
              })
              ticketSet.add(key)

              // เลขกลับ (ถ้าเลือกกลับเลข)
              if (type.type_number === 2 && useReverseNumbers) {
                const reversed = number.split("").reverse().join("")
                const reversedKey = `${reversed}-${type.id}`
                if (reversed !== number && !ticketSet.has(reversedKey)) {
                  tickets.push({
                    id: uuidv4(),
                    number: reversed,
                    type_id: type.id,
                    price: type.multiplication_factor,
                    amount: 1,
                    name: userName,
                    ticketNumber: reversed,
                  })
                  ticketSet.add(reversedKey)
                }
              }
            }
          })
        })

        if (duplicateNumbers.size > 0) {
          toast.error(`ไม่สามารถเพิ่มเลขซ้ำได้: ${Array.from(duplicateNumbers).join(', ')}`)
          return
        }

        if (tickets.length > 0) {
          onSubmit(tickets)
          setSelectedNumbers(new Set())
          setSelectedTypes(new Set())
          toast.success(`เพิ่ม ${tickets.length} รายการสำเร็จ`)
        } else {
          toast.error("ไม่สามารถเพิ่มรายการได้")
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeout.current) cancelAnimationFrame(scrollTimeout.current)
    scrollTimeout.current = requestAnimationFrame(() => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        setVisibleNumbers((prev) => {
          const more = filteredNumbers.slice(prev.length, prev.length + 50)
          return more.length ? [...prev, ...more] : prev
        })
      }
    })
  }

  useEffect(
    () => () => {
      if (scrollTimeout.current) cancelAnimationFrame(scrollTimeout.current)
    },
    [],
  )

  useEffect(() => {
    console.log("selectedType", selectedTypeTab);
  }, [selectedTypeTab]);

  return (
    <div className="w-full flex flex-col gap-4 text-sm">
      <motion.div className="flex border-b mb-3" variants={containerVariants} initial="hidden" animate="visible">
        {(["สามตัว", "สองตัว", "เลขวิ่ง"] as TicketType[]).map((type) => (
          <motion.div key={type} variants={itemVariants} className="flex-1">
            <Button
              variant={selectedTypeTab === type ? "default" : "ghost"}
              onClick={() => handleTypeTabChange(type)}
              className="w-full text-sm font-medium"
            >
              {type}
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="visible" variants={containerVariants}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="w-16 h-8 bg-muted animate-pulse rounded" />
            ))
          : listboxItems[selectedTypeTab].map((subType) => (
              <motion.div key={subType.id} variants={itemVariants}>
                <Button
                  variant={Array.from(selectedTypes).some(t => t.id === subType.id) ? "default" : "outline"}
                  className={cn(
                    "px-2 py-1 h-auto text-xs md:text-sm",
                    Array.from(selectedTypes).some(t => t.id === subType.id) && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleTypeSelect(subType)}
                >
                  {subType.type_name} x{subType.multiplication_factor}
                </Button>
              </motion.div>
            ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedTypeTab === "สามตัว" && (
          <motion.div
            key="filters"
            className="grid grid-cols-5 gap-2 mt-2"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={filterVariants}
          >
            {Array.from({ length: 10 }, (_, i) => i * 100).map((filter) => (
              <motion.div key={filter} variants={itemVariants}>
                <Button
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  className="px-1 py-0.5 h-auto w-full text-xs"
                  onClick={() => handleFilterSelect(filter)}
                >
                  {filter.toString().padStart(3, "0")}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex items-center gap-2 px-2 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Checkbox
          id="reverse-number"
          checked={useReverseNumbers}
          onCheckedChange={() => setUseReverseNumbers(!useReverseNumbers)}
          disabled={selectedTypeTab !== "สองตัว"}
        />
        <Label htmlFor="reverse-number" className="text-xs cursor-pointer md:text-sm">
          กลับเลข
        </Label>
      </motion.div>

      <ScrollArea className="h-[300px] rounded-md border" onScroll={handleScroll}>
        <motion.div
          className="grid grid-cols-5 gap-2 p-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {visibleNumbers.map((number) => {
            // Disable if any selectedTypes already has this number
            const isDuplicate = Array.from(selectedTypes).some(type =>
              tickets.some(t => t.number === number && t.type_id === type.id)
            )
            return (
              <motion.div
                key={number}
                variants={itemVariants}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "border rounded-md p-1 text-center cursor-pointer transition-all relative text-xs md:text-sm",
                  selectedNumbers.has(number)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted/50",
                  isDuplicate && "opacity-50 pointer-events-none bg-yellow-100 border-yellow-400"
                )}
                onClick={() => !isDuplicate && handleNumberToggle(number)}
                layout
              >
                {number}
              </motion.div>
            )
          })}
        </motion.div>
      </ScrollArea>

      <motion.div
        className="mt-4 flex justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          variant="outline"
          onClick={() => setSelectedNumbers(new Set())}
          disabled={!selectedNumbers.size}
          className="px-2 py-1 text-xs md:text-sm"
        >
          ล้างทั้งหมด
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !selectedNumbers.size ||
            isLoading ||
            isSubmitting ||
            selectedTypes.size === 0
          }
          className="relative overflow-hidden px-2 py-1 text-xs md:text-sm"
        >
          <span>ยืนยัน ({selectedNumbers.size})</span>
        </Button>
      </motion.div>
    </div>
  )
}

export default NumberSets
