"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

interface NumberSelectionDrawerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onApplyNumbers: (numbers: string[]) => void
  maxDigits: 1 | 2 | 3
  initialUseReverseNumbers?: boolean
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

const NumberSelectionDrawer = ({
  isOpen,
  onOpenChange,
  onApplyNumbers,
  maxDigits,
  initialUseReverseNumbers = false,
}: NumberSelectionDrawerProps) => {
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set())
  const [useReverseNumbers, setUseReverseNumbers] = useState(initialUseReverseNumbers)
  const [activeFilter, setActiveFilter] = useState<number | null>(null)
  const [visibleNumbers, setVisibleNumbers] = useState<string[]>([])
  const scrollTimeout = useRef<number | null>(null)

  const allThreeDigitNumbers = useMemo(() => Array.from({ length: 1000 }, (_, i) => i.toString().padStart(3, "0")), [])
  const allTwoDigitNumbers = useMemo(() => Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0")), [])
  const allOneDigitNumbers = useMemo(() => Array.from({ length: 10 }, (_, i) => i.toString()), [])

  const currentNumberList = useMemo(() => {
    if (maxDigits === 1) return allOneDigitNumbers
    if (maxDigits === 2) return allTwoDigitNumbers
    if (maxDigits === 3) return allThreeDigitNumbers
    return []
  }, [maxDigits, allOneDigitNumbers, allTwoDigitNumbers, allThreeDigitNumbers])

  const filteredNumbers = useMemo(() => {
    if (maxDigits === 3) {
      return activeFilter !== null
        ? currentNumberList.filter((num) => {
            const filterStartDigit = (activeFilter / 100).toString()
            return num.startsWith(filterStartDigit)
          })
        : currentNumberList // Show all 1000 for 3-digits if no filter, pagination handles view
    }
    return currentNumberList
  }, [maxDigits, activeFilter, currentNumberList])

  useEffect(() => {
    if (isOpen) {
      setSelectedNumbers(new Set())
      setActiveFilter(null)
      setUseReverseNumbers(maxDigits === 2 ? initialUseReverseNumbers : false)
    }
  }, [isOpen, maxDigits, initialUseReverseNumbers])

  useEffect(() => {
    // Effect to apply reverse to already selected numbers when useReverseNumbers is toggled ON
    if (maxDigits === 2 && useReverseNumbers) {
      setSelectedNumbers((prev) => {
        const updated = new Set(prev)
        let hasChanges = false
        prev.forEach((number) => {
          const reversed = number.split("").reverse().join("")
          if (reversed !== number && !updated.has(reversed)) {
            updated.add(reversed)
            hasChanges = true
          }
        })
        return hasChanges ? updated : prev
      })
    }
  }, [useReverseNumbers, maxDigits])

  useEffect(() => {
    if (filteredNumbers.length > 0) {
      setVisibleNumbers(filteredNumbers.slice(0, 100)) // Initial load for scroll area
    } else {
      setVisibleNumbers([])
    }
  }, [filteredNumbers])

  const handleNumberToggle = useCallback(
    (number: string) => {
      setSelectedNumbers((prev) => {
        const updated = new Set(prev)
        if (updated.has(number)) {
          updated.delete(number)
          if (maxDigits === 2 && useReverseNumbers) {
            const reversed = number.split("").reverse().join("")
            if (reversed !== number) updated.delete(reversed)
          }
        } else {
          updated.add(number)
          if (maxDigits === 2 && useReverseNumbers) {
            const reversed = number.split("").reverse().join("")
            if (reversed !== number) updated.add(reversed)
          }
        }
        return updated
      })
    },
    [useReverseNumbers, maxDigits],
  )

  const handleFilterSelect = (filter: number | null) => {
    setActiveFilter(filter === activeFilter ? null : filter)
  }

  const handleApply = () => {
    onApplyNumbers(Array.from(selectedNumbers))
    onOpenChange(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeout.current) cancelAnimationFrame(scrollTimeout.current)
    scrollTimeout.current = requestAnimationFrame(() => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && visibleNumbers.length < filteredNumbers.length) {
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
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md p-4 flex flex-col gap-4">
          <DrawerHeader className="p-0 text-left">
            <DrawerTitle>เลือกชุดตัวเลข ({maxDigits} ตัว)</DrawerTitle>
            <DrawerDescription>
              เลือกหมายเลขที่คุณต้องการเพิ่มลงในรายการ
            </DrawerDescription>
          </DrawerHeader>

          {maxDigits === 3 && (
            <motion.div
              key="filters-3-digit"
              className="grid grid-cols-5 gap-2"
              initial="hidden"
              animate="visible"
              variants={filterVariants}
            >
              {Array.from({ length: 10 }, (_, i) => i * 100).map((filterVal) => (
                <motion.div key={filterVal} variants={itemVariants}>
                  <Button
                    variant={activeFilter === filterVal ? "default" : "outline"}
                    size="sm"
                    className="px-1 py-0.5 h-auto w-full text-xs"
                    onClick={() => handleFilterSelect(filterVal)}
                  >
                    {`${(filterVal / 100)}-${(filterVal / 100)}${(filterVal / 100)}${(filterVal / 100)}`}
                  </Button>
                </motion.div>
              ))}
               <motion.div variants={itemVariants}>
                 
               </motion.div>
            </motion.div>
          )}

          {maxDigits === 2 && (
             <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <Checkbox
                id="drawer-reverse-number"
                checked={useReverseNumbers}
                onCheckedChange={(checked) => setUseReverseNumbers(Boolean(checked))}
                />
                <Label htmlFor="drawer-reverse-number" className="text-xs cursor-pointer md:text-sm">
                กลับเลข
                </Label>
            </motion.div>
          )}

          <ScrollArea className="h-[300px] md:h-[400px] rounded-md border" onScroll={handleScroll}>
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
               {visibleNumbers.length === 0 && <p className="col-span-5 text-center text-muted-foreground py-4">ไม่มีตัวเลขให้เลือก</p>}
            </motion.div>
          </ScrollArea>

          <DrawerFooter className="p-0 pt-4 flex-row justify-between items-center">
             <Button
                variant="outline"
                onClick={() => setSelectedNumbers(new Set())}
                disabled={selectedNumbers.size === 0}
                className="px-2 py-1 text-xs md:text-sm"
            >
                ล้างที่เลือก ({selectedNumbers.size})
            </Button>
            <div className="flex gap-2">
                <DrawerClose asChild>
                    <Button variant="outline">ยกเลิก</Button>
                </DrawerClose>
                <Button onClick={handleApply} disabled={selectedNumbers.size === 0}>
                    เพิ่ม ({selectedNumbers.size}) เลข
                </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default NumberSelectionDrawer
