"use client"
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2, RotateCcw, Clock, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import debounce from "lodash/debounce";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, addDays, differenceInDays, startOfDay, isAfter, parseISO, addMonths, isBefore, set } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { th } from "date-fns/locale";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { handlePrint } from "@/components/huaythai-print/ticket-print";

// Animation variants
const fadeSlideIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
};

interface TicketPurchaseItem {
  id: string;
  ticket_sub_type_id: string;
  ticket_number: string;
  amount: number;
  price: number;
  total: number;
  created_at: string;
  sub_type_name?: string;
}

interface TicketPurchase {
  id: string;
  transaction_id: string;
  user_id: string;
  ticket_set_name: string | null;
  ticket_set_number: string;
  created_at: string;
  purchase_date: string;
  deleted_at?: string | null;
  items: TicketPurchaseItem[];
}

interface ConsolidatedTicketPurchase {
  id: string;
  ticket_set_name: string | null;
  ticket_set_number: string;
  purchase_date: string;
  deleted_at?: string | null;
  items: TicketPurchaseItem[];
}

interface TicketSubType {
  id: string;
  type_name: string;
  multiplication_factor: number;
}

interface MatchingTicket {
  tod_number: string;
  teng_number: string;
  amount_display: string;
}

interface GroupedPurchaseItem {
  ticket_numbers: string[];
  amount: number;
}

interface GroupedItems {
  [key: string]: GroupedPurchaseItem[];
}

const ITEMS_PER_PAGE = 10;
const RETENTION_DAYS = 30;
const THAILAND_TZ = "Asia/Bangkok";

const TicketPurchasesPage = (): React.ReactElement => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [purchases, setPurchases] = useState<ConsolidatedTicketPurchase[]>([]);
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<{
    purchaseDate: string;
    ticketSetNumber: string;
    ticketSubTypeId: string;
    ticketSetName: string;
    dateRange: {
      start: Date | undefined;
      end: Date | undefined;
    };
  }>({
    purchaseDate: "",
    ticketSetNumber: "",
    ticketSubTypeId: "",
    ticketSetName: "",
    dateRange: {
      start: undefined,
      end: undefined,
    },
  });
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState<number>(0);
  const [hasWarnedFutureDate, setHasWarnedFutureDate] = useState<boolean>(false);
  const [formattedDrawDate, setFormattedDrawDate] = useState<string>("")
  const getThailandTime = () => {
    const now = new Date();
    return toZonedTime(now, THAILAND_TZ);
  };

  const convertUtcToThailandTime = (utcDateString: string) => {
    const utcDate = parseISO(utcDateString);
    return toZonedTime(utcDate, THAILAND_TZ);
  };
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
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: { user } },
          { data: ticketData, error: ticketError },
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("ticket_sub_types").select("*").order("type_name", { ascending: true }),
        ]);

        if (!user) {
          router.push("/login");
          return;
        }
        if (ticketError) throw ticketError;

        setUser(user);
        setTicketSubTypes(ticketData || []);
        const today = startOfDay(getThailandTime());
        setSelectedDate(today);
        setFilters((prev) => ({ ...prev, purchaseDate: format(today, "yyyy-MM-dd") }));
      } catch (err: any) {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [router]);
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
  useEffect(() => {
    const fetchDeletedCount = async () => {
      if (!user) return;
      try {
        const thirtyDaysAgo = startOfDay(getThailandTime());
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RETENTION_DAYS);
        const thirtyDaysAgoUtc = thirtyDaysAgo.toISOString();

        const { count, error } = await supabase
          .from("ticket_purchases")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("deleted_at", "is", null)
          .gte("deleted_at", thirtyDaysAgoUtc);

        if (error) throw error;
        setDeletedCount(count || 0);
      } catch (err: any) {
        console.error("Error fetching deleted count:", err);
      }
    };
    if (user) fetchDeletedCount();
  }, [user, showDeleted]);

  useEffect(() => {
    const cleanupExpiredPurchases = async () => {
      if (!user) return;
      try {
        const thirtyDaysAgo = startOfDay(getThailandTime());
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RETENTION_DAYS);
        const thirtyDaysAgoUtc = thirtyDaysAgo.toISOString();

        const { data, error } = await supabase
          .from("ticket_purchases")
          .select("id")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null)
          .lt("deleted_at", thirtyDaysAgoUtc);

        if (error) throw error;
        if (data?.length) {
          const ids = data.map((item) => item.id);
          const { error: deleteError } = await supabase.from("ticket_purchases").delete().in("id", ids);
          if (deleteError) throw deleteError;
        }
      } catch (err: any) {
        console.error("Error cleaning up expired purchases:", err);
      }
    };
    if (user) cleanupExpiredPurchases();
  }, [user]);

  const fetchPurchases = useCallback(
    async (pageIndex: number) => {
      if (!user) return;
      setIsLoading(true);
      try {
        const from = pageIndex * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("ticket_purchases")
          .select(
            `
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
          `
          )
          .eq("user_id", user.id)
          .order("purchase_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to);

        // Handle date range filter
        if (filters.dateRange.start && filters.dateRange.end) {
          const startDate = format(filters.dateRange.start, "yyyy-MM-dd");
          const endDate = format(filters.dateRange.end, "yyyy-MM-dd");
          query = query.gte("purchase_date", startDate).lte("purchase_date", endDate);
        } else if (filters.purchaseDate) {
          const selectedPurchaseDate = startOfDay(new Date(filters.purchaseDate));
          const today = startOfDay(getThailandTime());

          if (isAfter(selectedPurchaseDate, today)) {
            if (!hasWarnedFutureDate) {
              toast.warn("ไม่สามารถเลือกวันที่ในอนาคตได้", { position: "top-center" });
              setHasWarnedFutureDate(true);
            }
            setFilters((prev) => ({ ...prev, purchaseDate: format(today, "yyyy-MM-dd") }));
            setSelectedDate(today);
            query = query.eq("purchase_date", format(today, "yyyy-MM-dd"));
          } else {
            query = query.eq("purchase_date", filters.purchaseDate);
          }
        }

        if (filters.ticketSetNumber) query = query.ilike("ticket_set_number", `%${filters.ticketSetNumber}%`);
        if (filters.ticketSetName) query = query.ilike("ticket_set_name", `%${filters.ticketSetName}%`);
        if (filters.ticketSubTypeId && filters.ticketSubTypeId !== "all") {
          query = query.eq("ticket_purchase_items.ticket_sub_type_id", filters.ticketSubTypeId);
        }

        if (showDeleted) {
          const thirtyDaysAgo = startOfDay(getThailandTime());
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RETENTION_DAYS);
          const thirtyDaysAgoUtc = thirtyDaysAgo.toISOString();
          query = query.not("deleted_at", "is", null).gte("deleted_at", thirtyDaysAgoUtc);
        } else {
          query = query.is("deleted_at", null);
        }

        const { data, error } = await query;
        if (error) {
          toast.error(`เกิดข้อผิดพลาด: ${error.message}. กรุณาลองใหม่`, { position: "top-center" });
          return;
        }

        const formattedPurchases: TicketPurchase[] = (data || []).map((purchase) => ({
          ...purchase,
          created_at: convertUtcToThailandTime(purchase.created_at).toISOString(),
          purchase_date: format(convertUtcToThailandTime(purchase.purchase_date), "yyyy-MM-dd"),
          deleted_at: purchase.deleted_at ? convertUtcToThailandTime(purchase.deleted_at).toISOString() : null,
          items: purchase.ticket_purchase_items.map((item: any) => ({
            ...item,
            created_at: convertUtcToThailandTime(item.created_at).toISOString(),
            sub_type_name: item.ticket_sub_types?.type_name || "Unknown",
          })),
        }));

        // Group purchases by ticket_set_number and ticket_set_name
        const groupedPurchases = formattedPurchases.reduce((acc, purchase) => {
          const key = `${purchase.ticket_set_number}-${purchase.ticket_set_name || "ไม่มีชื่อ"}`;
          if (!acc[key]) {
            acc[key] = {
              id: purchase.id,
              ticket_set_name: purchase.ticket_set_name,
              ticket_set_number: purchase.ticket_set_number,
              purchase_date: purchase.purchase_date,
              deleted_at: purchase.deleted_at,
              items: purchase.items,
            };
          } else {
            // Merge items, ensuring deleted_at consistency
            acc[key].items = [...acc[key].items, ...purchase.items];
            // If any purchase in the group is not deleted, treat the group as not deleted
            if (!purchase.deleted_at) {
              acc[key].deleted_at = null;
            }
          }
          return acc;
        }, {} as Record<string, ConsolidatedTicketPurchase>);

        const consolidatedPurchases = Object.values(groupedPurchases);

        setHasMore(consolidatedPurchases.length === ITEMS_PER_PAGE);
        setPurchases((prev) => (pageIndex === 0 ? consolidatedPurchases : [...prev, ...consolidatedPurchases]));
      } catch (err: any) {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + (err.message || "ไม่สามารถดึงข้อมูลได้"), {
          position: "top-center",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, filters, showDeleted, hasWarnedFutureDate]
  );

  const debouncedFetchPurchases = useCallback(debounce(fetchPurchases, 300), [fetchPurchases]);

  useEffect(() => {
    setPage(0);
    setPurchases([]);
    debouncedFetchPurchases(0);
    return () => debouncedFetchPurchases.cancel();
  }, [user, filters, showDeleted, debouncedFetchPurchases]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setHasWarnedFutureDate(false);
  };

  const toggleExpand = (purchaseId: string) => {
    setExpandedPurchases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(purchaseId)) newSet.delete(purchaseId);
      else newSet.add(purchaseId);
      return newSet;
    });
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      debouncedFetchPurchases(nextPage);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) loadMore();
  };

  const openDeleteDialog = (purchaseId: string) => {
    setPurchaseToDelete(purchaseId);
    setDeleteDialogOpen(true);
  };

  const handleDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    setIsLoading(true);
    try {
      const now = getThailandTime().toISOString();
      const { error } = await supabase.from("ticket_purchases").update({ deleted_at: now }).eq("id", purchaseToDelete);
      if (error) throw error;

      setPurchases((prev) => prev.filter((purchase) => purchase.id !== purchaseToDelete));
      setDeletedCount((prev) => prev + 1);
      toast.success("ลบรายการเรียบร้อย (เก็บไว้ 30 วัน)", { position: "top-center" });
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ: " + err.message, { position: "top-center" });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      setPage(0);
      setPurchases([]);
      debouncedFetchPurchases(0);
    }
  };

  const handleRestorePurchase = async (purchaseId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("ticket_purchases").update({ deleted_at: null }).eq("id", purchaseId);
      if (error) throw error;

      setPurchases((prev) => prev.filter((purchase) => purchase.id !== purchaseId));
      setDeletedCount((prev) => Math.max(0, prev - 1));
      toast.success("คืนค่ารายการเรียบร้อย", { position: "top-center" });
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการคืนค่า: " + err.message, { position: "top-center" });
    } finally {
      setIsLoading(false);
      setPage(0);
      setPurchases([]);
      debouncedFetchPurchases(0);
    }
  };

  const fetchMatchingTickets = async (ticketSetNumber: string): Promise<MatchingTicket[] | null> => {
    try {
      const { data, error } = await supabase.rpc('get_matching_tickets', {
        p_ticket_set_number: ticketSetNumber
      });

      if (error) throw error;
      return data as MatchingTicket[];
    } catch (err: any) {
      console.error('Error fetching matching tickets:', err);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message);
      return null;
    }
  };

  const toggleShowDeleted = () => setShowDeleted((prev) => !prev);

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = convertUtcToThailandTime(deletedAt);
    const expiryDate = addDays(deletedDate, RETENTION_DAYS);
    return Math.max(0, differenceInDays(expiryDate, getThailandTime()));
  };

  const groupedPurchaseItems = (items: TicketPurchaseItem[]): GroupedItems => {
    // Step 1: Group by sub_type_name
    const groupedByType = items.reduce((acc, item) => {
      const group = item.sub_type_name || "ไม่ทราบประเภท";
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, TicketPurchaseItem[]>);

    // Step 2: Within each group, group ticket_numbers by amount
    const finalGrouped = Object.entries(groupedByType).reduce((acc, [groupName, groupItems]) => {
      const groupedByAmount: GroupedPurchaseItem[] = [];
      groupItems.forEach(item => {
        const existingGroup = groupedByAmount.find(g => g.amount === item.amount);
        if (existingGroup) {
          existingGroup.ticket_numbers.push(item.ticket_number);
        } else {
          groupedByAmount.push({
            ticket_numbers: [item.ticket_number],
            amount: item.amount,
          });
        }
      });
      acc[groupName] = groupedByAmount;
      return acc;
    }, {} as GroupedItems);

    return finalGrouped;
  };

  const getDrawPeriodDates = () => {
    const now = getThailandTime();
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let startDate: Date, endDate: Date;

    if ((day === 16 && hours >= 17) || (day > 16) || (day === 1 && hours < 15)) {
      // Period: 16th 17:00 to 1st 14:30
      startDate = set(now, { date: 16, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });
      endDate = set(addMonths(now, 1), { date: 1, hours: 14, minutes: 30, seconds: 0, milliseconds: 0 });
    } else {
      // Period: 1st 17:00 to 16th 14:30
      startDate = set(now, { date: 1, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });
      endDate = set(now, { date: 16, hours: 14, minutes: 30, seconds: 0, milliseconds: 0 });
    }

    return { startDate, endDate };
  };

  const handleSearch = () => {
    setPage(0);
    setPurchases([]);
    debouncedFetchPurchases(0);
  };

  const handleDateRangeSelect = () => {
    const { startDate, endDate } = getDrawPeriodDates();
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: startDate,
        end: endDate
      }
    }));
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>ประวัติการซื้อบิล</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeSlideIn}
          className="min-h-screen bg-gray-50 p-4"
        >
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <motion.div
              variants={fadeSlideIn}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-sm font-semibold text-gray-900">ประวัติการซื้อบิล</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs"
                  >
                    {showFilters ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
                  </Button>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        กำลังโหลด...
                      </>
                    ) : (
                      user?.user_metadata?.name || "Guest"
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Filter Form */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-range" className="text-xs font-medium text-gray-700">ช่วงวันที่</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs bg-white hover:bg-gray-50 text-gray-900 border-gray-200"
                            >
                              {filters.dateRange.start ? format(filters.dateRange.start, "dd MMM yyyy", { locale: th }) : "วันที่เริ่มต้น"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={filters.dateRange.start}
                              onSelect={(date) => {
                                setFilters(prev => ({
                                  ...prev,
                                  dateRange: { ...prev.dateRange, start: date }
                                }));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs bg-white hover:bg-gray-50 text-gray-900 border-gray-200"
                            >
                              {filters.dateRange.end ? format(filters.dateRange.end, "dd MMM yyyy", { locale: th }) : "วันที่สิ้นสุด"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={filters.dateRange.end}
                              onSelect={(date) => {
                                setFilters(prev => ({
                                  ...prev,
                                  dateRange: { ...prev.dateRange, end: date }
                                }));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-set-number" className="text-xs font-medium text-gray-700">เลขบิล</Label>
                      <Input
                        id="ticket-set-number"
                        value={filters.ticketSetNumber}
                        onChange={(e) => handleFilterChange("ticketSetNumber", e.target.value)}
                        placeholder="ค้นหาเลขบิล"
                        className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-set-name" className="text-xs font-medium text-gray-700">ชื่อบิล</Label>
                      <Input
                        id="ticket-set-name"
                        value={filters.ticketSetName}
                        onChange={(e) => handleFilterChange("ticketSetName", e.target.value)}
                        placeholder="ค้นหาชื่อบิล"
                        className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-sub-type" className="text-xs font-medium text-gray-700">ประเภทบิล</Label>
                      <Select
                        value={filters.ticketSubTypeId}
                        onValueChange={(value) => handleFilterChange("ticketSubTypeId", value)}
                      >
                        <SelectTrigger className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="เลือกประเภทบิล" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ทั้งหมด</SelectItem>
                          {ticketSubTypes.map((subType) => (
                            <SelectItem key={subType.id} value={subType.id}>{subType.type_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = startOfDay(getThailandTime());
                        setFilters({
                          purchaseDate: format(today, "yyyy-MM-dd"),
                          ticketSetNumber: "",
                          ticketSubTypeId: "",
                          ticketSetName: "",
                          dateRange: {
                            start: undefined,
                            end: undefined
                          }
                        });
                        setSelectedDate(today);
                        setShowDeleted(false);
                        setPage(0);
                        setPurchases([]);
                        debouncedFetchPurchases(0);
                      }}
                      className="text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      รีเซ็ตตัวกรอง
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDateRangeSelect}
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      เลือกช่วงวันที่ประกาศผล
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSearch}
                      className="text-xs bg-green-600 hover:bg-green-700"
                    >
                      ค้นหา
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle Deleted */}
            <motion.div 
              variants={fadeSlideIn} 
              className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={toggleShowDeleted}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  showDeleted ? "bg-red-50 text-red-700 border-red-200" : "bg-white border-gray-200"
                )}
              >
                {showDeleted ? (
                  <>
                    <RotateCcw className="w-3 h-3" /> แสดงรายการปกติ
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" /> แสดงรายการที่ลบ {deletedCount > 0 && `(${deletedCount})`}
                  </>
                )}
              </Button>
              <span className="text-xs text-gray-500">
                {showDeleted ? "กำลังแสดงรายการที่ลบ (เก็บ 30 วัน)" : "กำลังแสดงรายการปกติ"}
              </span>
            </motion.div>

            {/* Purchase List */}
            <Card className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
              <ScrollArea className="max-h-auto" onScroll={handleScroll}>
                <div className="p-4 space-y-3">
                  {isLoading && !purchases.length ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center text-gray-500 py-6 text-sm">
                      {showDeleted ? "ไม่พบรายการที่ลบใน 30 วัน" : `ไม่พบรายการซื้อสำหรับวันที่ ${selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: th }) : "ที่เลือก"}`}
                    </div>
                  ) : (
                    <>
                      {purchases.map((purchase) => {
                        const groupedItems = groupedPurchaseItems(purchase.items);
                        const isDeleted = purchase.deleted_at !== null;
                        const daysRemaining = isDeleted ? getDaysRemaining(purchase.deleted_at!) : null;
                        const totalAmount = purchase.items.reduce((sum, item) => sum + item.amount, 0);

                        return (
                          <motion.div key={purchase.id} variants={fadeSlideIn}>
                            <Card className={`border ${isDeleted ? "border-red-200 bg-red-50" : "border-gray-200"} rounded-lg`}>
                              <div
                                className={`flex justify-between items-center p-3 cursor-pointer ${
                                  isDeleted ? "bg-red-100" : "bg-blue-50"
                                }`}
                                onClick={() => toggleExpand(purchase.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <h2 className={`text-xs font-semibold ${isDeleted ? "text-red-800" : "text-blue-800"}`}>
                                    {purchase.ticket_set_name || "ไม่มีชื่อ"} ({purchase.ticket_set_number})
                                  </h2>
                                  {isDeleted && daysRemaining !== null && (
                                    <Badge variant="secondary" className="bg-red-200 text-red-800 flex items-center gap-1 text-xs">
                                      <Clock className="w-3 h-3" /> {daysRemaining} วัน
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">
                                    {new Date(purchase.purchase_date).toLocaleDateString("th-TH")}
                                  </span>
                                  {expandedPurchases.has(purchase.id) ? (
                                    <ChevronUp className={`w-4 h-4 ${isDeleted ? "text-red-600" : "text-blue-600"}`} />
                                  ) : (
                                    <ChevronDown className={`w-4 h-4 ${isDeleted ? "text-red-600" : "text-blue-600"}`} />
                                  )}
                                </div>
                              </div>
                              <AnimatePresence>
                                {expandedPurchases.has(purchase.id) && (
                                  <motion.div initial="hidden" animate="visible" exit="exit" variants={fadeSlideIn}>
                                    <div className="p-3">
                                      {Object.entries(groupedItems).map(([groupName, groupedItems]) => (
                                        <div key={groupName} className="mb-2">
                                          <div className={`font-medium p-2 rounded-lg text-xs ${
                                            isDeleted ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
                                          }`}>
                                            {groupName}
                                            {(() => {
                                              const subType = ticketSubTypes.find(
                                                (type) => type.type_name === groupName
                                              );
                                              return subType ? ` x ${subType.multiplication_factor}` : "";
                                            })()}
                                          </div>
                                          <div className="space-y-1 mt-1">
                                            {groupedItems.map((group, index) => (
                                              <div
                                                key={index}
                                                className={`flex flex-wrap items-center p-2 rounded-lg gap-1 ${
                                                  isDeleted ? "hover:bg-red-100" : "hover:bg-blue-50"
                                                }`}
                                              >
                                                <div className="flex flex-wrap gap-0.5 mr-1">
                                                  {group.ticket_numbers.map((number: string, numberIndex: number) => (
                                                    <div key={numberIndex} className="flex gap-0.2">
                                                      {number.split("  ").map((digit: string, i: number) => (
                                                        <span
                                                          key={i}
                                                          className={`flex items-center justify-center text-xs font-semibold w-6 h-4 rounded-sm ${
                                                            isDeleted ? "text-red-800 bg-red-100" : "text-blue-800 bg-blue-100"
                                                          }`}
                                                        >
                                                          {digit}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  ))}
                                                </div>
                                                <span className="flex-1 min-w-[50px]" />
                                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                                  x{group.amount.toFixed(0)} ฿
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="p-3 bg-gray-50 flex flex-wrap justify-between items-center gap-2 rounded-b-lg">
                                      <span className="text-xs font-medium text-gray-700">
                                        ยอดรวม: {totalAmount.toFixed(0)} ฿
                                      </span>
                                      <TooltipProvider>
                                        <div className="flex flex-wrap gap-2">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrint({ purchase, ticketSubTypes, user })}
                                                className="border-blue-500 text-blue-600 hover:bg-blue-50 text-xs px-2"
                                              >
                                                <Printer className="w-3 h-3 mr-1" />
                                                พิมพ์
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>พิมพ์รายการบิลนี้</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => (isDeleted ? handleRestorePurchase(purchase.id) : openDeleteDialog(purchase.id))}
                                                className={`${
                                                  isDeleted
                                                    ? "border-red-500 text-red-600 hover:bg-red-50"
                                                    : "border-blue-500 text-blue-600 hover:bg-blue-50"
                                                } text-xs px-2`}
                                              >
                                                {isDeleted ? (
                                                  <>
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    คืนค่า
                                                  </>
                                                ) : (
                                                  <>
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    ลบ
                                                  </>
                                                )}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{isDeleted ? "คืนค่ารายการนี้" : "ลบรายการนี้"}</TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </TooltipProvider>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.div>
                        );
                      })}
                      {isLoading && purchases.length > 0 && (
                        <div className="flex justify-center py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                      )}
                      {!isLoading && !hasMore && purchases.length > 0 && (
                        <div className="text-center py-3 text-xs text-gray-500">ไม่มีข้อมูลเพิ่มเติม</div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Footer */}
            <motion.div variants={fadeSlideIn} className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/huaythai")}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 text-xs"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                ย้อนกลับ
              </Button>
              {showDeleted && (
                <span className="text-xs text-gray-500">รายการที่ลบจะถูกเก็บไว้ 30 วัน</span>
              )}
            </motion.div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">ยืนยันการลบ</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    รายการที่ลบจะถูกเก็บไว้ 30 วัน หลังจากนั้นจะไม่สามารถกู้คืนได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs">ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePurchase} className="bg-red-600 hover:bg-red-700 text-xs">
                    ลบรายการ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default TicketPurchasesPage;