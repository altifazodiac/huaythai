"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import type { Ticket, TicketSubType } from "@/types/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "react-toastify"

// Custom scrollbar hiding styles
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`

interface TicketListProps {
  tickets: Ticket[]
  onDelete: (id: string) => void
  onDeleteAll: () => void
  onDeleteLast: () => void
  onPriceEntry: () => void
}

const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

const TicketList = ({ tickets, onDelete, onDeleteAll, onDeleteLast, onPriceEntry }: TicketListProps) => {
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  // Fetch ticket sub-types
  useEffect(() => {
    const fetchTicketSubTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_sub_types")
          .select("*")
          .order("type_name", { ascending: true })

        if (error) throw error
        
        // Properly map the data to ensure it conforms to TicketSubType interface
        if (data) {
          const typedData: TicketSubType[] = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))
          
          setTicketSubTypes(typedData)

          // Initialize all types as expanded
          const initialExpanded: Record<string, boolean> = {}
          typedData.forEach((type) => {
            if (type.type_name) {
              initialExpanded[type.type_name] = true
            }
          })
          
          setExpandedTypes(initialExpanded)
        }
      } catch (err: any) {
        toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message)
      }
    }
    fetchTicketSubTypes()
  }, [supabase])
 const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastItemRef = useRef<HTMLDivElement>(null)
  const prevTicketCount = useRef(tickets.length)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    console.log("Tickets changed:", tickets.length, "Prev count:", prevTicketCount.current);
    if (tickets.length > prevTicketCount.current && lastItemRef.current) {
      lastItemRef.current.scrollIntoView({ behavior: "smooth" });
      const newTicket = tickets[tickets.length - 1];
      if (newTicket.id !== highlightId) {
        console.log("Highlighting ticket:", newTicket.id);
        setHighlightId(newTicket.id);
        setTimeout(() => setHighlightId(null), 1000);
      }
    }
    prevTicketCount.current = tickets.length;
  }, [tickets, highlightId]);
  const groupedTickets = useMemo(() => {
    return ticketSubTypes.reduce((acc, subType) => {
      const filtered = tickets.filter((t) => t.type_id === subType.id);
      if (filtered.length > 0) {
        acc[subType.type_name] = filtered;
      }
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [tickets, ticketSubTypes]);
  
  const activeTicketTypes = useMemo(() => Object.keys(groupedTickets), [groupedTickets]);
 
  const totalTickets = tickets.length

  const toggleTypeExpansion = (typeName: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [typeName]: !prev[typeName],
    }))
  }

  // Add style tag to hide scrollbars
  useEffect(() => {
    const styleTag = document.createElement("style")
    styleTag.textContent = scrollbarHideStyles
    document.head.appendChild(styleTag)

    return () => {
      document.head.removeChild(styleTag)
    }
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      className="bg-gray-50 h-full flex flex-col"
    >
      {/* Mobile action buttons */}
      <div className="flex justify-between items-center p-3 border-b bg-white md:hidden">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={totalTickets === 0}
            className="text-red-500 border-red-500 hover:bg-red-50 disabled:opacity-50 text-sm py-1 px-2"
          >
            ลบทั้งหมด [{totalTickets}]
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteLast}
            disabled={totalTickets === 0}
            className="text-gray-500 border-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm py-1 px-2"
          >
            ลบล่าสุด [{totalTickets > 0 ? 1 : 0}]
          </Button>
          <Button
            onClick={onPriceEntry}
            disabled={totalTickets === 0}
            className="text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 py-1 px-2"
          >
            ใส่ราคา
          </Button>
        </div>
      </div>

      {/* Desktop/Tablet action buttons - Top */}
      <div className="hidden md:flex justify-between items-center p-3 border-b bg-white">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={totalTickets === 0}
            className="text-red-500 border-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            ลบทั้งหมด [{totalTickets}]
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteLast}
            disabled={totalTickets === 0}
            className="text-gray-500 border-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            ลบล่าสุด [{totalTickets > 0 ? 1 : 0}]
          </Button>
        </div>
        <Button
          onClick={onPriceEntry}
          disabled={totalTickets === 0}
          size="sm"
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white md:hidden"
        >
          ใส่ราคา
        </Button>
      </div>

      <div className="flex-grow w-full overflow-hidden">
        <ScrollArea className="h-full" ref={scrollContainerRef}>
          <div className="flex flex-col space-y-3 p-3">
            {activeTicketTypes.length > 0 ? (
              activeTicketTypes.map((typeName) => (
                <motion.div key={typeName} variants={fadeInVariants}>
                  <Card className="bg-white shadow-sm w-full">
                    <CardHeader
                      className="bg-blue-100 p-2 cursor-pointer"
                      onClick={() => toggleTypeExpansion(typeName)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <h3 className="font-medium text-blue-800 text-sm">{typeName}</h3>
                          <span className="ml-2 text-xs text-blue-600">
                            {expandedTypes[typeName] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs">
                          {groupedTickets[typeName]?.length || 0} รายการ
                        </Badge>
                      </div>
                    </CardHeader>
                    {expandedTypes[typeName] && (
                      <CardContent className="p-0">
                        <div className="max-h-[250px] overflow-y-auto scrollbar-hide">
                          <AnimatePresence>
                            {groupedTickets[typeName].map((ticket, index) => {
                              const isLast = tickets[tickets.length - 1]?.id === ticket.id
                              return (
                                <motion.div
                                  key={ticket.id}
                                  variants={fadeInVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  ref={isLast ? lastItemRef : null}
                                  className={`flex items-center px-3 py-2 border-b border-gray-100 transition-all ${
                                    highlightId === ticket.id ? "bg-blue-50" : ""
                                  } hover:bg-blue-50`}
                                >
                                  <span className="text-gray-500 mr-2 font-medium text-xs w-5">{index + 1}.</span>
                                  <div className="flex space-x-1 mr-3">
                                    {ticket.number.split("").map((digit, i) => (
                                      <span
                                        key={i}
                                        className="w-6 h-6 bg-blue-200 rounded-md flex items-center justify-center text-xs font-semibold text-blue-800 shadow-sm"
                                      >
                                        {digit}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-600 flex-1">x{ticket.price}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(ticket.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">ไม่มีรายการตั๋ว</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}

export default TicketList
