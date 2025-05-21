"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/huaythai/header";
import TicketList from "@/components/huaythai/ticket-list";
import NumberPad from "@/components/huaythai/number-pad";
import type { Ticket, TicketSubType } from "@/types/types";
import { createClient } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";

const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
};

export default function LotteryPage() {
  const isHydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const hasReplacedRef = useRef(false); // ย้ายมาที่ top level

  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeView, setActiveView] = useState<"ticketlist" | "numberpad">("ticketlist");
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<TicketSubType>({
    id: "",
    type_name: "สามตัวบน",
    type_number: 3,
    multiplication_factor: 900,
  });
  const [useReverseNumbers, setUseReverseNumbers] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  // Parse state from URL params
  useEffect(() => {
    console.log("useEffect triggered with searchParams:", searchParams.toString());
    if (hasReplacedRef.current) {
      console.log("Skipping due to hasReplacedRef");
      return;
    }

    const confirmedTicketsParam = searchParams.get("confirmedTickets");
    const allTicketsParam = searchParams.get("allTickets");
    const numberSetsStateParam = searchParams.get("numberSetsState");

    if (confirmedTicketsParam) {
      try {
        const confirmedTickets = JSON.parse(confirmedTicketsParam);
        setTickets((prevTickets) =>
          prevTickets
            .map((ticket) => {
              const confirmed = confirmedTickets.find((ct: any) => ct.ticket.id === ticket.id);
              if (confirmed && confirmed.amount > 0) {
                return { ...ticket, amount: confirmed.amount };
              }
              return ticket;
            })
            .filter((ticket) => ticket.amount && ticket.amount > 0)
        );
        setSelectedNumbers(new Set());
        setSelectedType({ 
          id: "", 
          type_name: "สามตัวบน", 
          multiplication_factor: 900,
          type_number: 1 
        });
        setUseReverseNumbers(false);
        setActiveFilter(null);
        localStorage.removeItem("numberSetsState");
        hasReplacedRef.current = true;
        router.replace("/huaythai");
      } catch (error) {
        console.error("Failed to parse confirmedTickets:", error);
      }
    } else if (allTicketsParam) {
      try {
        const allTickets = JSON.parse(allTicketsParam);
        setTickets(allTickets);
        if (numberSetsStateParam) {
          try {
            const numberSetsState = JSON.parse(numberSetsStateParam);
            if (Array.isArray(numberSetsState.selectedNumbers)) {
              setSelectedNumbers(new Set(numberSetsState.selectedNumbers));
              setSelectedType({ 
                id: "", 
                type_name: "สามตัวบน", 
                multiplication_factor: 900,
                type_number: 1 
              });
              setUseReverseNumbers(numberSetsState.useReverseNumbers || false);
              setActiveFilter(numberSetsState.activeFilter || null);
            }
          } catch (error) {
            console.error("Failed to parse numberSetsState:", error);
          }
        } else {
          setSelectedNumbers(new Set());
          setSelectedType({ 
            id: "", 
            type_name: "สามตัวบน", 
            multiplication_factor: 900,
            type_number: 1 
          });
          setUseReverseNumbers(false);
          setActiveFilter(null);
        }
        hasReplacedRef.current = true;
        router.replace("/huaythai");
      } catch (error) {
        console.error("Failed to parse allTickets:", error);
      }
    }
  }, [searchParams, router]);

  // Handle URL parameters for ticket data when returning from price entry
  useEffect(() => {
    const ticketsParam = searchParams.get('tickets');
    const numberSetsStateParam = searchParams.get('numberSetsState');
    
    if (ticketsParam) {
      try {
        const parsedTickets = JSON.parse(ticketsParam);
        if (Array.isArray(parsedTickets)) {
          setTickets(parsedTickets);
        }
      } catch (error) {
        console.error('Error parsing tickets from URL:', error);
      }
    }

    if (numberSetsStateParam) {
      try {
        const parsedState = JSON.parse(numberSetsStateParam);
        if (parsedState.selectedNumbers) {
          setSelectedNumbers(new Set(parsedState.selectedNumbers));
        }
        if (parsedState.selectedType) {
          setSelectedType(parsedState.selectedType);
        }
        if (typeof parsedState.useReverseNumbers === 'boolean') {
          setUseReverseNumbers(parsedState.useReverseNumbers);
        }
        if (parsedState.activeFilter !== undefined) {
          setActiveFilter(parsedState.activeFilter);
        }
      } catch (error) {
        console.error('Error parsing numberSetsState from URL:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.push("/signup");
      }
    };
    fetchUserData();
  }, [router, supabase]);

  useEffect(() => {
    const savedState = localStorage.getItem("numberSetsState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const numbers = Array.isArray(parsed.selectedNumbers) ? parsed.selectedNumbers : [];
        setSelectedNumbers(new Set(numbers));
        setSelectedType({ 
          id: "", 
          type_name: "สามตัวบน", 
          multiplication_factor: 900,
          type_number: 1 
        });
        setUseReverseNumbers(parsed.useReverseNumbers || false);
        setActiveFilter(parsed.activeFilter || null);
      } catch (error) {
        console.error("Failed to parse numberSetsState from localStorage:", error);
        setSelectedNumbers(new Set());
        setSelectedType({ 
          id: "", 
          type_name: "สามตัวบน", 
          multiplication_factor: 900,
          type_number: 1 
        });
        setUseReverseNumbers(false);
        setActiveFilter(null);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "numberSetsState",
      JSON.stringify({
        selectedNumbers: Array.from(selectedNumbers),
        selectedType,
        useReverseNumbers,
        activeFilter,
      })
    );
  }, [selectedNumbers, selectedType, useReverseNumbers, activeFilter]);

  const handleAddTicket = (data: { number: string; type: TicketSubType; price: number }) => {
    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      number: data.number,
      type_id: data.type.id,
      price: data.price,
      amount: 1,
      name: user?.name || "Unknown User",
      ticketNumber: data.number,
    };
    setTickets((prev) => [...prev, newTicket]);
    setActiveView("ticketlist");
  };

  const handleAddMultipleTickets = (newTickets: Ticket[]) => {
    setTickets((prev) => [...prev, ...newTickets]);
    setActiveView("ticketlist");
  };

  const handleNavigateToPriceEntry = (): void => {
    if (tickets.length > 0) {
      // Generate a unique session ID
      const sessionId = crypto.randomUUID();
      
      // Store data in localStorage
      localStorage.setItem(`priceEntry_${sessionId}`, JSON.stringify({
        tickets,
        numberSetsState: {
          selectedNumbers: Array.from(selectedNumbers),
          selectedType,
          useReverseNumbers,
          activeFilter,
        }
      }));

      // Only pass the session ID in URL
      router.push(`/huaythaiprice-entry?sessionId=${sessionId}`);
    }
  };

  const handleDeleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((ticket) => ticket.id !== id));
  };

  const handleDeleteLastTicket = () => {
    if (tickets.length > 0) {
      setTickets((prev) => prev.slice(0, -1));
    }
  };

  const handleDeleteAllTickets = () => {
    setTickets([]);
  };

  if (!isHydrated) return null;

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
                    <BreadcrumbPage>สรุปรายงาน</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-col h-screen bg-gray-50">
            <Header totalTickets={tickets.length} counter="00:30" />
            <div className="flex-grow overflow-hidden pb-[60px] md:pb-0">
              <div className="md:flex md:flex-row h-full">
                <div
                  className={`w-full md:w-1/2 h-full ${
                    activeView === "ticketlist" ? "block" : "hidden md:block"
                  }`}
                >
                  <TicketList
                    tickets={tickets}
                    onDelete={handleDeleteTicket}
                    onDeleteAll={handleDeleteAllTickets}
                    onDeleteLast={handleDeleteLastTicket}
                    onPriceEntry={handleNavigateToPriceEntry}
                  />
                </div>
                <div
                  className={`w-full md:w-1/2 h-full ${
                    activeView === "numberpad" ? "block" : "hidden md:block"
                  }`}
                >
                  <NumberPad
                    selectedNumbers={selectedNumbers}
                    setSelectedNumbers={setSelectedNumbers}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    useReverseNumbers={useReverseNumbers}
                    setUseReverseNumbers={setUseReverseNumbers}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    onSubmit={handleAddTicket}
                    onSubmitMultiple={handleAddMultipleTickets}
                    onPriceEntry={handleNavigateToPriceEntry}
                    userName={user?.name || "Unknown User"}
                    tickets={tickets}
                  />
                </div>
              </div>
            </div>
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex h-[40px]">
              <button
                onClick={() => setActiveView("numberpad")}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeView === "numberpad" ? "bg-blue-600 text-white" : "text-gray-600"
                }`}
              >
                ใส่เลข
              </button>
              <button
                onClick={() => {
                  setActiveView("ticketlist");
                }}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeView === "ticketlist" ? "bg-blue-600 text-white" : "text-gray-600"
                }`}
              >
                รายการ ({tickets.length})
              </button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}
