"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import type { Ticket, TicketSubType } from "@/types/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useTicketSubTypes } from "@/components/contexts/TicketSubTypeContext"
import { useSearchParams } from "next/navigation"

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
  onTicketsUpdate?: (tickets: Ticket[]) => void
}

const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

const TicketList = ({ tickets, onDelete, onDeleteAll, onDeleteLast, onPriceEntry, onTicketsUpdate }: TicketListProps) => {
  const ticketSubTypes = useTicketSubTypes()
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})
  const [duplicateNumbers, setDuplicateNumbers] = useState<Record<string, string[]>>({})
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastItemRef = useRef<HTMLDivElement>(null)
  const prevTicketCount = useRef(tickets.length)

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

  // Handle URL parameters for ticket data
  useEffect(() => {
    const ticketsParam = searchParams.get('tickets')
    if (ticketsParam && onTicketsUpdate) {
      try {
        const parsedTickets = JSON.parse(ticketsParam)
        if (Array.isArray(parsedTickets)) {
          onTicketsUpdate(parsedTickets)
        }
      } catch (error) {
        console.error('Error parsing tickets from URL:', error)
      }
    }
  }, [searchParams, onTicketsUpdate])

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
          const typedData: TicketSubType[] = data.map((item) => ({
            id: String(item.id || ""),
            type_name: String(item.type_name || ""),
            multiplication_factor: Number(item.multiplication_factor || 0),
            type_number: Number(item.type_number || 0),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))
          
          const sortedTypes = typedData.sort((a, b) => {
            if (a.type_number !== b.type_number) {
              return a.type_number - b.type_number;
            }
            return a.type_name.localeCompare(b.type_name);
          });
          
          const initialExpanded: Record<string, boolean> = {}
          sortedTypes.forEach((type) => {
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

  // Handle ticket changes and scrolling
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

  // Add style tag to hide scrollbars
  useEffect(() => {
    const styleTag = document.createElement("style")
    styleTag.textContent = scrollbarHideStyles
    document.head.appendChild(styleTag)

    return () => {
      document.head.removeChild(styleTag)
    }
  }, [])

  // Check for duplicate numbers within each type
  useEffect(() => {
    const duplicates: Record<string, string[]> = {}
    
    Object.entries(groupedTickets).forEach(([typeName, typeTickets]) => {
      const numbers = typeTickets.map(t => t.number)
      const uniqueNumbers = new Set(numbers)
      
      if (numbers.length !== uniqueNumbers.size) {
        const duplicatesInType = numbers.filter((number, index) => 
          numbers.indexOf(number) !== index
        )
        duplicates[typeName] = [...new Set(duplicatesInType)]
      }
    })
    
    setDuplicateNumbers(duplicates)
  }, [groupedTickets])

  const totalTickets = tickets.length

  const toggleTypeExpansion = (typeName: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [typeName]: !prev[typeName],
    }))
  }

  if (!ticketSubTypes.length) return <div>Loading...</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      className="bg-gray-50 dark:bg-gray-900 h-full flex flex-col"
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
      <div className="hidden md:flex justify-between items-center p-3 border-b bg-white dark:bg-gray-900">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={totalTickets === 0}
            className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-900 disabled:opacity-50"
          >
            ลบทั้งหมด [{totalTickets}]
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteLast}
            disabled={totalTickets === 0}
            className="text-gray-500 border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            ลบล่าสุด [{totalTickets > 0 ? 1 : 0}]
          </Button>
        </div>
        <Button
          onClick={onPriceEntry}
          disabled={totalTickets === 0}
          size="sm"
          className="ml-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-900 text-white md:hidden"
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
                  <Card className={`bg-white dark:bg-gray-900 shadow-sm w-full ${
                    duplicateNumbers[typeName]?.length > 0 ? 'border-2 border-yellow-400 dark:border-yellow-300' : ''
                  }`}>
                    <CardHeader
                      className={`p-2 cursor-pointer ${
                        duplicateNumbers[typeName]?.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900' : 'bg-blue-100 dark:bg-blue-900'
                      }`}
                      onClick={() => toggleTypeExpansion(typeName)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm">{typeName}</h3>
                          {duplicateNumbers[typeName]?.length > 0 && (
                            <AlertTriangle className="ml-2 w-4 h-4 text-yellow-500 dark:text-yellow-300" />
                          )}
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-200">
                            {expandedTypes[typeName] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                        <Badge variant="secondary" className={`$${
                          duplicateNumbers[typeName]?.length > 0 
                            ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                            : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        } text-xs`}>
                          {groupedTickets[typeName]?.length || 0} รายการ
                        </Badge>
                      </div>
                    </CardHeader>
                    {expandedTypes[typeName] && (
                      <CardContent className="p-0">
                        <div className="max-h-[280px] overflow-y-auto scrollbar-hide flex flex-wrap gap-2 p-2">
                          <AnimatePresence initial={false}>
                            {groupedTickets[typeName].map((ticket, index) => (
                              <motion.div
                                key={ticket.id}
                                layout
                                variants={fadeInVariants}
                                custom={index}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={`group relative shadow-md hover:shadow-lg rounded-lg transition-all duration-300 ease-in-out flex-shrink-0 min-w-[50px] ${
                                  duplicateNumbers[typeName]?.includes(ticket.number)
                                    ? 'bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-400 dark:border-yellow-300'
                                    : 'bg-white dark:bg-gray-800'
                                }`}
                              >
                                <div className="p-2.5 flex items-center">
                                  <span className={`text-sm font-medium ${
                                    duplicateNumbers[typeName]?.includes(ticket.number)
                                      ? 'text-yellow-800 dark:text-yellow-200'
                                      : 'text-gray-700 dark:text-gray-200'
                                  } break-all`}>
                                    {ticket.number}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDelete(ticket.id)}
                                  aria-label={`Delete ticket ${ticket.number}`}
                                  className="absolute -top-2 -right-2 
                                    text-gray-400 dark:text-gray-500 
                                    hover:text-red-500 dark:hover:text-red-400 
                                    opacity-0 group-hover:opacity-100 focus:opacity-100 
                                    transition-all duration-200 
                                    rounded-full p-1 
                                    w-8 h-8 flex items-center justify-center 
                                    hover:bg-red-100 dark:hover:bg-red-900/50
                                    md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 
                                    opacity-100"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {tickets.length === 0 && (
                            <div className="w-full text-center text-gray-500 dark:text-gray-300 py-8 text-sm">ไม่มีรายการตั๋ว</div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-300 py-8 text-sm">ไม่มีรายการตั๋ว</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}

export default TicketList
