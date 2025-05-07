"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { v4 as uuidv4 } from "uuid"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { Ticket, TicketSubType } from "@/types/types"

interface NumberSetsProps {
  onSubmit?: (tickets: Ticket[]) => void
  selectedNumbers: Set<string>
  setSelectedNumbers: React.Dispatch<React.SetStateAction<Set<string>>>
  selectedType: TicketSubType
  setSelectedType: React.Dispatch<React.SetStateAction<TicketSubType>>
  useReverseNumbers: boolean
  setUseReverseNumbers: React.Dispatch<React.SetStateAction<boolean>>
  activeFilter: number | null
  setActiveFilter: React.Dispatch<React.SetStateAction<number | null>>
  userName?: string
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

const VALID_TYPE_NAMES = ["สามตัวบน", "สามตัวโต๊ด", "สองตัวบน", "สองตัวล่าง"]

const NumberSets = ({
  onSubmit,
  selectedNumbers,
  setSelectedNumbers,
  selectedType,
  setSelectedType,
  useReverseNumbers,
  setUseReverseNumbers,
  activeFilter,
  setActiveFilter,
  userName = "Unknown User",
}: NumberSetsProps) => {
  const [visibleNumbers, setVisibleNumbers] = useState<string[]>([])
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const scrollTimeout = useRef<number | null>(null)
  const supabase = createClient()

  const allThreeDigitNumbers = useMemo(() => Array.from({ length: 1000 }, (_, i) => i.toString().padStart(3, "0")), [])
  const allTwoDigitNumbers = useMemo(() => Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0")), [])
  const allOneDigitNumbers = useMemo(() => Array.from({ length: 10 }, (_, i) => i.toString()), [])

  const filteredNumbers = useMemo(() => {
    if (selectedType.type_name.includes("สามตัว")) {
      return activeFilter !== null
        ? allThreeDigitNumbers.filter((num) => {
            const filterStr = activeFilter.toString().padStart(3, "0").substring(0, 1)
            return num.startsWith(filterStr)
          })
        : allThreeDigitNumbers.slice(0, 100)
    }
    if (selectedType.type_name.includes("สองตัว")) return allTwoDigitNumbers
    if (selectedType.type_name.includes("วิ่ง")) return allOneDigitNumbers
    return []
  }, [selectedType, activeFilter, allThreeDigitNumbers, allTwoDigitNumbers, allOneDigitNumbers])

  useEffect(() => {
    if (!(selectedNumbers instanceof Set)) {
      console.warn("selectedNumbers is not a Set, resetting to new Set")
      setSelectedNumbers(new Set())
    }
  }, [selectedNumbers, setSelectedNumbers])

  const updateSelectedNumbersWithReverse = useCallback(() => {
    if (!selectedType.type_name.includes("สองตัว")) return

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
  }, [useReverseNumbers, selectedType, setSelectedNumbers])

  useEffect(() => {
    if (selectedType.type_name.includes("สองตัว")) {
      updateSelectedNumbersWithReverse()
    }
  }, [useReverseNumbers, selectedType, updateSelectedNumbersWithReverse])

  useEffect(() => {
    const fetchTicketSubTypes = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("ticket_sub_types")
          .select("*")
          .order("type_name", { ascending: true })

        if (error) throw error

        if (data) {
          // Properly map the data to ensure it conforms to TicketSubType interface
          const typedData: TicketSubType[] = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))

          // Filter for valid types
          const validTypes = typedData.filter((type) => VALID_TYPE_NAMES.includes(type.type_name))

          setTicketSubTypes(validTypes)

          if (validTypes.length > 0 && !selectedType.id) {
            setSelectedType(validTypes[0])
          }
        }
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTicketSubTypes()
  }, [setSelectedType, selectedType.id, supabase])

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

        if (selectedType.type_name.includes("สองตัว") && useReverseNumbers) {
          const reversed = number.split("").reverse().join("")
          if (updated.has(number)) updated.add(reversed)
          else updated.delete(reversed)
        }
        return updated
      })
    },
    [useReverseNumbers, selectedType, setSelectedNumbers],
  )

  const handleTypeSelect = (subType: TicketSubType) => {
    setSelectedType(subType)
    setSelectedNumbers(new Set())
    setActiveFilter(null)
    setUseReverseNumbers(false)
  }

  const handleFilterSelect = (filter: number | null) => {
    setActiveFilter(filter === activeFilter ? null : filter)
  }

  const handleSubmit = async () => {
    if (selectedNumbers.size && onSubmit) {
      setIsSubmitting(true)
      try {
        const tickets = Array.from(selectedNumbers).map((number) => ({
          id: uuidv4(),
          number,
          type_id: selectedType.id,
          price: selectedType.multiplication_factor,
          amount: 1,
          name: userName,
          ticketNumber: number,
        }))
        onSubmit(tickets)
        setSelectedNumbers(new Set())
        toast.success(`เพิ่ม ${tickets.length} รายการสำเร็จ`)
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

  return (
    <div className="w-full flex flex-col gap-4 text-sm">
      <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="visible" variants={containerVariants}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="w-16 h-8 bg-muted animate-pulse rounded" />
            ))
          : ticketSubTypes.map((subType) => (
              <motion.div key={subType.id} variants={itemVariants}>
                <Button
                  variant={selectedType.id === subType.id ? "default" : "outline"}
                  className="px-2 py-1 h-auto text-xs md:text-sm"
                  onClick={() => handleTypeSelect(subType)}
                >
                  {subType.type_name} x{subType.multiplication_factor}
                </Button>
              </motion.div>
            ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedType.type_name.includes("สามตัว") && (
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
          disabled={!selectedType.type_name.includes("สองตัว")}
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
          {visibleNumbers.map((number) => (
            <motion.div
              key={number}
              variants={itemVariants}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "border rounded-md p-1 text-center cursor-pointer transition-all relative text-xs md:text-sm",
                selectedNumbers.has(number)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted/50",
              )}
              onClick={() => handleNumberToggle(number)}
              layout
            >
              {number}
            </motion.div>
          ))}
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
          disabled={!selectedNumbers.size || isLoading || isSubmitting}
          className="relative overflow-hidden px-2 py-1 text-xs md:text-sm"
        >
          <span>ยืนยัน ({selectedNumbers.size})</span>
        </Button>
      </motion.div>
    </div>
  )
}

export default NumberSets
