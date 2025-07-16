"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PrinterIcon, Trash2, ChevronDown, ChevronUp, RotateCcw, Eye, EyeOff, Edit } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  HeaderGroup,
  Header,
  Row,
} from "@tanstack/react-table";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import { handlePrint, fetchTicketPurchase } from "@/lib/lottery-print";

// Import additional types and functions from lottery-print
interface TicketDisplayItem {
  subType: {
    lottery_sub_type_id: number;
    sub_type_name: string;
    payout_rate: number;
  };
  payout: {
    id: number;
    lottery_sub_type_id: number;
    digit_number: number;
    type_number: string;
    price_paid: number;
  };
  numbers: string[];
  amount: number;
}

interface PrintLotteryTicketItem {
  id: string;
  numbers: string[];
  amount: number;
  lottery_sub_types: {
    lottery_sub_type_id: number;
    sub_type_name: string;
    payout_rate: number;
  };
  lottery_sub_number: {
    id: number;
    lottery_sub_type_id: number;
    digit_number: number;
    type_number: string;
    price_paid: number;
  };
}

// Enhanced createGroups function from lottery-print.tsx
const createEnhancedGroups = (ticketItems: TicketDisplayItem[], preferredOrderMap: Record<number, string[]> = {}) => {
  const allTypeLabels: Record<number, string[]> = {};

  // Build type labels mapping
  ticketItems.forEach(item => {
    const label = item.payout.type_number || "-";
    if (!allTypeLabels[item.payout.digit_number]) allTypeLabels[item.payout.digit_number] = [];
    if (!allTypeLabels[item.payout.digit_number].includes(label)) {
      allTypeLabels[item.payout.digit_number].push(label);
    }
  });

  // Order labels for specific digit numbers using preferredOrderMap from DB
  Object.keys(allTypeLabels).forEach(digitStr => {
    const digit = Number(digitStr);
    const labels = allTypeLabels[digit];
    let ordered: string[] = [...labels];
    // กำหนด fallback order ตาม digit
    let fallback: string[] = [];
    if (digit === 2) fallback = ["บน", "ล่าง"];
    else if (digit === 3 || digit === 4) fallback = ["บน", "โต๊ด"];
    else if (digit === 1) fallback = ["วิ่งบน", "วิ่งล่าง"];
    
    // ใช้ preferredOrderMap ถ้ามีและครบ
    if (preferredOrderMap[digit] && preferredOrderMap[digit].length >= fallback.length) {
      ordered = preferredOrderMap[digit].filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    } else if (fallback.length > 0) {
      ordered = fallback.filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    }
    allTypeLabels[digit] = ordered;

    // หลังจาก allTypeLabels[digit] = ordered; ให้แน่ใจว่า typeOrder มีครบ
    if (digit === 2) {
      allTypeLabels[digit] = ["บน", "ล่าง"];
    }
    if (digit === 3) {
      allTypeLabels[digit] = ["บน", "โต๊ด"];
    }
    if (digit === 4) {
      allTypeLabels[digit] = ["บน", "โต๊ด"];
    }
    if (digit === 1) {
      allTypeLabels[digit] = ["วิ่งบน", "วิ่งล่าง"];
    }
  });

  // สร้าง groups ใหม่
  const groups: Map<string, Grouped> = new Map();

  // 1. สร้าง mapping: {digit, number} => {typeLabel: amount}
  const numberMap: Record<string, { digit: number, number: string, amounts: Record<string, number> }> = {};

  ticketItems.forEach(item => {
    const digit = item.payout.digit_number;
    const label = item.payout.type_number;
    item.numbers.forEach(num => {
      const key = `${digit}|${num}`;
      if (!numberMap[key]) {
        numberMap[key] = { digit, number: num, amounts: {} };
      }
      numberMap[key].amounts[label] = item.amount;
    });
  });

  // 2. Group by digit + typeOrder + amounts signature
  Object.values(numberMap).forEach(({ digit, number, amounts }) => {
    const typeOrder = allTypeLabels[digit];
    // signature เช่น "10|30" (เช่น บน 10 ล่าง 30)
    // ปรับ amountsSignature ให้แสดง 0 ถ้าไม่มีการสั่งซื้อ label นั้น
    const amountsSignature = typeOrder.map(label => amounts[label] !== undefined ? amounts[label] : 0).join('|');
    const key = `${digit}|${typeOrder.join(",")}|${amountsSignature}`;

    if (!groups.has(key)) {
      groups.set(key, {
        digit_number: digit,
        numbers: [],
        typeLabels: typeOrder,
        amounts: Object.fromEntries(typeOrder.map((lab, idx) => [lab, amounts[lab] !== undefined ? amounts[lab] : 0])),
        typeOrder: typeOrder,
      });
    }
    const group = groups.get(key)!;
    if (!group.numbers.includes(number)) group.numbers.push(number);
  });

  return groups;
};

// Interfaces
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
}

interface LotterySubNumber {
  id: number;
  lottery_sub_type_id: number;
  digit_number: number;
  type_number: string;
  price_paid: number;
}

interface LotteryTicketItem {
  id: number;
  ticket_id: number;
  lottery_sub_type_id: number;
  lottery_sub_number_id: number;
  numbers: string[];
  amount: number;
  lottery_sub_types: LotterySubType;
  lottery_sub_number: LotterySubNumber;
}

interface LotteryTicket {
  id: string;
  user_id: string;
  username?: string;
  draw_date: string;
  draw_time: string;
  bill_number: string;
  bill_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  payout_amount: number;
  deleted_at?: string | null;
  lottery_ticket_items: LotteryTicketItem[];
}

interface StatusChangeHistory {
  id: string;
  ticket_id: string;
  user_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  username?: string;
}

interface Grouped {
  digit_number: number;
  numbers: string[];
  typeLabels: string[];
  amounts: Record<string, number>;
  typeOrder: string[];
}

// FIXED: Fetch Tickets Function
const fetchTickets = async (
  supabase: any,
  user: any,
  role: string,
  filters: { billNumber: string; startDate: string; endDate: string; status: string; username: string; lotterySubTypeId: string; },
  page: number,
  pageSize: number,
  showDeleted: boolean = false
) => {
  let query = supabase
    .from("lottery_tickets_with_user_details")
    .select(
      `
      *,
      lottery_ticket_items (
        *,
        lottery_sub_types (
          lottery_sub_type_id,
          sub_type_name
        ),
        lottery_sub_number (
          id,
          lottery_sub_type_id,
          digit_number,
          type_number,
          price_paid
        )
      )
    `
    )
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order("created_at", { ascending: false });

  // Filter based on deleted status
  if (showDeleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (role !== "admin") {
    query = query.eq("user_id", user.id);
  }
  if (filters.billNumber) {
    query = query.ilike("bill_number", `%${filters.billNumber}%`);
  }
  if (filters.startDate) {
    query = query.gte("draw_date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("draw_date", filters.endDate);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.username && role === "admin") {
    query = query.ilike("username", `%${filters.username}%`);
  }
  if (filters.lotterySubTypeId && filters.lotterySubTypeId !== 'all') {
    query = query.eq('lottery_ticket_items.lottery_sub_type_id', filters.lotterySubTypeId)
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }

  // FIXED: Ensure proper data structure and calculate totals
  const processedData = (data || []).map((ticket: any) => ({
    ...ticket,
    // FIXED: Ensure payout_amount is properly initialized
    payout_amount: ticket.payout_amount || 0,
    // FIXED: Ensure lottery_ticket_items is array
    lottery_ticket_items: ticket.lottery_ticket_items || [],
    // FIXED: Recalculate total_amount if needed
    total_amount: ticket.total_amount || 
      (ticket.lottery_ticket_items || []).reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
  }));

  console.log("Processed ticket data:", processedData); // Debug log
  return processedData;
};

// FIXED: Fetch Status History Function
const fetchStatusHistory = async (supabase: any, ticketId: string) => {
  const { data, error } = await supabase
    .from("status_change_history")
    .select(`
      *,
      profiles!user_id(name)
    `)
    .eq("ticket_id", ticketId)
    .order("changed_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching status history:", error);
    return [];
  }
  
  // FIXED: Process status history data
  return (data || []).map((item: any) => ({
    ...item,
    username: item.profiles?.name || "ไม่ทราบ"
  }));
};

// FIXED: Columns Definition
const createColumns = (
  onPrintClick: (billNumber: string) => Promise<void>,
  setDeletingTicket: (ticket: LotteryTicket | null) => void,
  setDeleteDialogOpen: (open: boolean) => void,
  onRestoreClick: (ticket: LotteryTicket) => Promise<void>,
  showDeleted: boolean,
  onEditStatusClick: (ticket: LotteryTicket) => void,
  role: string
): ColumnDef<LotteryTicket>[] => [
   // FIXED: Add username column for admin
   ...(role === "admin" ? [{
    accessorKey: "username",
    header: "ผู้ใช้",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {row.original.username || "ไม่ระบุ"}
      </span>
    ),
  }] : []),
  {
    accessorKey: "bill_number",
    header: ({ column }: { column: any }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        เลขบิล
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <div className={`font-medium ${row.original.deleted_at ? "text-gray-400 line-through" : ""}`}>
        {row.original.bill_number || "ไม่ระบุ"}
        {row.original.deleted_at && <span className="ml-2 text-xs text-red-500">(ลบแล้ว)</span>}
      </div>
    ),
  },
  {
    accessorKey: "sub_type_name",
    header: "ประเภทหวย",
    cell: ({ row }: { row: Row<LotteryTicket> }) => {
      // FIXED: Get all unique lottery types from ticket items
      const uniqueTypes = [...new Set(
        row.original.lottery_ticket_items
          ?.map(item => item.lottery_sub_types?.sub_type_name)
          .filter(Boolean) || []
      )];
      
      return (
        <span className={row.original.deleted_at ? "text-gray-400" : ""}>
          {uniqueTypes.length > 0 ? uniqueTypes.join(", ") : "ไม่ระบุ"}
        </span>
      );
    },
  },
  {
    accessorKey: "bill_name",
    header: "ชื่อบิล",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {row.original.bill_name || "ไม่ระบุ"}
      </span>
    ),
    enableHiding: true,
  },
 
  {
    accessorKey: "draw_date",
    header: ({ column }: { column: any }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        วันที่ออกรางวัล
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {`${format(new Date(row.original.draw_date), "d MMM yyyy", { locale: th })} ${row.original.draw_time || ""}`}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }: { column: any }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        วันที่ซื้อ
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <div className={row.original.deleted_at ? "text-gray-400" : ""}>
        <div>{format(new Date(row.original.created_at), "d MMM yyyy HH:mm", { locale: th })}</div>
        {row.original.deleted_at && (
          <div className="text-xs text-red-500">
            ลบเมื่อ: {format(new Date(row.original.deleted_at), "d MMM yyyy HH:mm", { locale: th })}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "total_amount",
    header: "ยอดรวม (฿)",
    cell: ({ row }: { row: Row<LotteryTicket> }) => {
      // FIXED: Calculate total amount correctly
      const calculatedTotal = row.original.lottery_ticket_items?.reduce((sum, item) => {
        return sum + (parseFloat(item.amount?.toString() || "0"));
      }, 0) || 0;
      
      const displayAmount = row.original.total_amount || calculatedTotal;
      
      return (
        <span className={row.original.deleted_at ? "text-gray-400" : ""}>
          {displayAmount.toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: "payout_amount",
    header: "เงินรางวัล (฿)",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {(row.original.payout_amount ?? 0).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "สถานะ",
    cell: ({ row }: { row: Row<LotteryTicket> }) => {
      const status = row.original.status;
      const statusStyles: Record<string, string> = {
        confirmed: row.original.deleted_at ? "text-gray-400" : "text-green-600",
        pending: row.original.deleted_at ? "text-gray-400" : "text-yellow-600",
        cancelled: row.original.deleted_at ? "text-gray-400" : "text-red-600",
      };
      const statusText: Record<string, string> = {
        confirmed: "จ่ายเงินแล้ว",
        pending: "รอจ่ายเงิน",
        cancelled: "ยกเลิก",
      };
      return <span className={statusStyles[status] || "text-gray-600"}>{statusText[status] || status}</span>;
    },
  },
  {
    id: "actions",
    header: "ชำระเงิน",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <div className="flex gap-2">
        {!row.original.deleted_at ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrintClick(row.original.bill_number)}
            >
              <PrinterIcon className="mr-1 h-4 w-4" />
              พิมพ์
            </Button>
            {row.original.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStatusClick(row.original)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Edit className="mr-1 h-4 w-4" />
                แก้ไขสถานะ
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeletingTicket(row.original);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              ลบ
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestoreClick(row.original)}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            กู้คืน
          </Button>
        )}
      </div>
    ),
  },
];

export default function LotteryPurchasePage() {
  useRequireAuth();
  const router = useRouter();
  const { supabase } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");
  const [filters, setFilters] = useState({
    billNumber: "",
    startDate: "",
    endDate: "",
    status: "",
    username: "",
    lotterySubTypeId: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<LotteryTicket | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showDeleted, setShowDeleted] = useState(false);
  const [statusEditDialogOpen, setStatusEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<LotteryTicket | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusHistory, setStatusHistory] = useState<StatusChangeHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());

  // Fetch user data
  React.useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    };
    fetchUserData();
  }, [router, supabase]);

  // Fetch user role
  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      setRole(roleRow?.role || "user");
    };
    fetchUserRole();
  }, [user, supabase]);

  // React Query for fetching all users (for admin dropdown)
  const { data: users = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["all_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) {
        toast.error("ไม่สามารถโหลดรายชื่อผู้ใช้ได้: " + error.message);
        return [];
      }
      return data;
    },
    enabled: role === "admin",
  });

  // React Query for fetching all lottery sub-types
  const { data: lotterySubTypes = [] } = useQuery<{ lottery_sub_type_id: number; sub_type_name: string; }[]>({
    queryKey: ["lottery_sub_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lottery_sub_types")
        .select("lottery_sub_type_id, sub_type_name")
        .order("sub_type_name", { ascending: true });
      if (error) {
        toast.error("ไม่สามารถโหลดประเภทหวยได้: " + error.message);
        return [];
      }
      return data;
    },
  });

  // React Query for fetching tickets
  const { data: tickets = [], isLoading, refetch } = useQuery<LotteryTicket[]>({
    queryKey: ["lottery_tickets", user?.id, role, filters, page, pageSize, showDeleted],
    queryFn: () => fetchTickets(supabase, user, role, filters, page, pageSize, showDeleted),
    enabled: !!user,
  });

  // Print function
  const onPrintClick = async (billNumber: string) => {
    const printToastId = toast.loading("กำลังเตรียมข้อมูลสำหรับพิมพ์...");
    try {
      const purchaseData = await fetchTicketPurchase({ bill_number: billNumber, supabase });
      if (purchaseData) {
        await handlePrint({ purchase: purchaseData, ticketSubTypes: [], user });
        toast.success("กำลังเปิดหน้าต่างพิมพ์...", { id: printToastId });
      } else {
        toast.error("ไม่พบข้อมูลบิลสำหรับพิมพ์", { id: printToastId });
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการเตรียมพิมพ์: " + error.message, { id: printToastId });
    }
  };

  // Soft delete function
  const handleDeleteTicket = async () => {
    if (!deletingTicket || !user) return;
    try {
      const { error } = await supabase
        .from("lottery_tickets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deletingTicket.id);
      
      if (error) throw error;
      
      await supabase
        .from("delete_history")
        .insert({
          ticket_id: deletingTicket.id,
          user_id: user.id,
          reason: deleteReason,
          deleted_at: new Date().toISOString(),
        });
        
      toast.success("ลบรายการสำเร็จ (จะถูกลบถาวรใน 30 วัน)");
      setDeleteDialogOpen(false);
      setDeletingTicket(null);
      setDeleteReason("");
      refetch(); // Refresh the data
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ: " + error.message);
    }
  };

  // Restore function
  const handleRestoreTicket = async (ticket: LotteryTicket) => {
    try {
      const { error } = await supabase
        .from("lottery_tickets")
        .update({ deleted_at: null })
        .eq("id", ticket.id);
      
      if (error) throw error;
      
      // Also remove from delete_history
      await supabase
        .from("delete_history")
        .delete()
        .eq("ticket_id", ticket.id);
        
      toast.success("กู้คืนรายการสำเร็จ");
      refetch(); // Refresh the data
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการกู้คืน: " + error.message);
    }
  };

  // Status edit function
  const handleEditStatus = async () => {
    if (!editingTicket || !newStatus || !user) return;
    
    try {
      const { error } = await supabase
        .from("lottery_tickets")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingTicket.id);
      
      if (error) throw error;
      
      // Log status change
      await supabase
        .from("status_change_history")
        .insert({
          ticket_id: editingTicket.id,
          user_id: user.id,
          old_status: editingTicket.status,
          new_status: newStatus,
          changed_at: new Date().toISOString(),
        });
        
      toast.success("อัปเดตสถานะสำเร็จ");
      setStatusEditDialogOpen(false);
      setEditingTicket(null);
      setNewStatus("");
      refetch(); // Refresh the data
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + error.message);
    }
  };

  const handleDateShortcut = (period: 'today' | 'month' | 'year') => {
    const today = new Date();
    let start = '';
    let end = '';

    if (period === 'today') {
      start = format(today, 'yyyy-MM-dd');
      end = format(today, 'yyyy-MM-dd');
    } else if (period === 'month') {
      start = format(startOfMonth(today), 'yyyy-MM-dd');
      end = format(endOfMonth(today), 'yyyy-MM-dd');
    } else if (period === 'year') {
      start = format(startOfYear(today), 'yyyy-MM-dd');
      end = format(endOfYear(today), 'yyyy-MM-dd');
        }
        
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  // Enhanced row expand function with complete ticket data
  const [enhancedTicketData, setEnhancedTicketData] = useState<Record<string, {
    groups: Map<string, Grouped>;
    items: PrintLotteryTicketItem[];
  }>>({});

  const handleRowExpand = async (ticketId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
        return newSet;
      } else {
        newSet.add(ticketId);
        
        // Load enhanced ticket data if not already loaded
        if (!enhancedTicketData[ticketId] && !loadingHistory.has(ticketId)) {
          setLoadingHistory(prev => new Set(prev).add(ticketId));
          
          // Find the ticket to get bill_number
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket) {
            // Load complete ticket data using fetchTicketPurchase
            fetchTicketPurchase({ bill_number: ticket.bill_number, supabase })
              .then(purchaseData => {
                if (purchaseData) {
                  // Transform to TicketDisplayItem format
                  const displayItems: TicketDisplayItem[] = purchaseData.items.map(item => ({
                    subType: item.lottery_sub_types,
                    payout: item.lottery_sub_number,
                    numbers: item.numbers,
                    amount: item.amount,
                  }));
                  
                  // Create enhanced groups
                  const groups = createEnhancedGroups(displayItems);
                  
                  // Store enhanced data
                  setEnhancedTicketData(prev => ({
                    ...prev,
                    [ticketId]: {
                      groups,
                      items: purchaseData.items
                    }
                  }));
                }
              })
              .catch(error => {
                console.error("Error loading enhanced ticket data:", error);
              });
          }
          
          // Load status history
          fetchStatusHistory(supabase, ticketId)
            .then(history => {
              setStatusHistory(prev => prev.filter(h => h.ticket_id !== ticketId).concat(history));
            })
            .catch(error => {
              console.error("Error loading status history:", error);
            })
            .finally(() => {
              setLoadingHistory(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticketId);
                return newSet;
              });
            });
        }
        return newSet;
      }
    });
  };

  // TanStack Table - FIXED: Pass role parameter
  const table = useReactTable({
    data: tickets,
    columns: createColumns(
      onPrintClick, 
      setDeletingTicket, 
      setDeleteDialogOpen, 
      handleRestoreTicket, 
      showDeleted,
      (ticket: LotteryTicket) => {
        setEditingTicket(ticket);
        setNewStatus("");
        setStatusEditDialogOpen(true);
      },
      role
    ),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
    },
  });

  if (isLoading) {
    return (
      <DirectionProvider dir="ltr">
        <SidebarProvider>
          <SidebarInset>
            <div className="flex items-center justify-center h-screen">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </DirectionProvider>
    );
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 px-4 border-b">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">รายการบิลหวย</h1>
          </header>
          <div className="p-4 max-w-7xl mx-auto">
            {/* Filter Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <Input
                      placeholder="ค้นหาเลขบิล"
                      value={filters.billNumber}
                      onChange={(e) => setFilters({ ...filters, billNumber: e.target.value })}
                      className="w-40"
                    />
                    <div className="flex items-center gap-2">
                    <Input
                      type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-40"
                        title="จากวันที่"
                    />
                      <span>-</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-40"
                        title="ถึงวันที่"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleDateShortcut('today')}>วันนี้</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDateShortcut('month')}>เดือนนี้</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDateShortcut('year')}>ปีนี้</Button>
                    </div>
                    <Select
                      value={filters.lotterySubTypeId}
                      onValueChange={(value) => setFilters({ ...filters, lotterySubTypeId: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="ประเภทหวย" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          <SelectItem value="all">หวยทั้งหมด</SelectItem>
                          {lotterySubTypes.map((type) => (
                            <SelectItem key={type.lottery_sub_type_id} value={type.lottery_sub_type_id.toString()}>
                              {type.sub_type_name}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="สถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="confirmed">จ่ายเงินแล้ว</SelectItem>
                        <SelectItem value="pending">รอจ่ายเงิน</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                    {role === "admin" && (
                      <Select
                        value={filters.username}
                        onValueChange={(value) => setFilters({ ...filters, username: value === 'all' ? '' : value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="เลือกผู้ใช้" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-72">
                            <SelectItem value="all">ผู้ใช้ทั้งหมด</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.name}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ billNumber: "", startDate: "", endDate: "", status: "", username: "", lotterySubTypeId: "" })}
                    >
                      ล้างตัวกรอง
                    </Button>
                    
                    {/* Toggle show deleted button */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        variant={showDeleted ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowDeleted(!showDeleted);
                          setPage(1); // Reset to first page when toggling
                        }}
                        className={showDeleted ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        {showDeleted ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {showDeleted ? "ซ่อนรายการที่ลบ" : "แสดงรายการที่ลบ"}
                      </Button>
                      {showDeleted && (
                        <span className="text-sm text-red-600 font-medium">
                          ({tickets.length} รายการที่ลบ)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${showDeleted ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <span>
                          {showDeleted 
                            ? "กำลังแสดงรายการที่ลบแล้ว (ข้อมูลจะถูกลบถาวรใน 30 วัน)" 
                            : "กำลังแสดงรายการปกติ"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <React.Fragment key={row.id}>
                              <motion.tr
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                data-state={row.getIsSelected() && "selected"}
                                onClick={() => {
                                  handleRowExpand(row.original.id);
                                }}
                                className="cursor-pointer hover:bg-muted/50"
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell key={cell.id}>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                ))}
                              </motion.tr>
                              <AnimatePresence>
                                {expandedRows.has(row.original.id) && (
                                  <motion.tr
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  >
                                    <TableCell
                                      colSpan={table.getAllColumns().length}
                                      className="p-0 border-0"
                                    >
                                      <motion.div 
                                        className="p-4 bg-muted/50"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.1 }}
                                      >
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                          {/* Enhanced Bet Details */}
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              รายละเอียดการแทง
                                            </h4>
                                            {loadingHistory.has(row.original.id) && !enhancedTicketData[row.original.id] ? (
                                              <div className="flex items-center justify-center py-8">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                                                <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลที่ครบถ้วน...</span>
                                              </div>
                                            ) : enhancedTicketData[row.original.id] ? (
                                              <div>
                                                {/* Enhanced ticket summary */}
                                                <div className="mb-4 p-3 border rounded-lg bg-blue-50 border-blue-200">
                                                  <div className="text-sm font-medium text-blue-800 mb-2">
                                                    ข้อมูลที่ครบถ้วน - {enhancedTicketData[row.original.id].items.length > 0 ? 
                                                      enhancedTicketData[row.original.id].items[0].lottery_sub_types.sub_type_name : 
                                                      'ไม่ระบุประเภท'}
                                                  </div>
                                                  <div className="text-xs text-blue-600">
                                                    ยอดรวมทั้งหมด: {Array.from(enhancedTicketData[row.original.id].groups.values())
                                                      .reduce((total, group) => {
                                                        return total + group.typeOrder.reduce((sum, label) => {
                                                          return sum + (group.amounts[label] ?? 0) * group.numbers.length;
                                                        }, 0);
                                                      }, 0).toFixed(0)} ฿
                                                  </div>
                                                </div>
                                                {/* Enhanced groups */}
                                                {Array.from(enhancedTicketData[row.original.id].groups.values()).map((group, idx) => (
                                                <div key={idx} className="mb-4 p-3 border rounded-lg bg-background">
                                                  <div className="flex gap-4">
                                                    <div className="w-32 flex-shrink-0">
                                                      <div className="text-sm font-medium text-primary">
                                                        {group.digit_number} ตัว
                                                      </div>
                                                      <div className="text-xs text-muted-foreground mt-1">
                                                          {group.typeOrder.join('  ')}
                                                      </div>
                                                        <div className="text-xs mt-1">
                                                          {group.typeOrder.map((label: string) => 
                                                            (group.amounts[label] ?? 0).toFixed(0)
                                                          ).join(' x ')}
                                                      </div>
                                                      <div className="text-xs text-green-600 font-medium mt-2 pt-1 border-t">
                                                          รวม: {(group.typeOrder
                                                          .reduce((sum: number, label: string) => {
                                                            return sum + (group.amounts[label] || 0);
                                                            }, 0) * group.numbers.length)
                                                          .toFixed(0)} ฿
                                                      </div>
                                                    </div>
                                                    <div className="flex-1">
                                                      <div className="text-xs text-muted-foreground mb-1">
                                                        ตัวเลขที่แทง ({group.numbers.length} ตัว):
                                                      </div>
                                                      <div className="text-sm bg-muted p-2 rounded border">
                                                          <div className="flex flex-wrap gap-2">
                                                        {group.numbers
                                                          .map((num: string) => num.toString().padStart(group.digit_number, '0'))
                                                              .map((num: string) => (
                                                                <span key={num} className="inline-block bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                                                                  {num}
                                                                </span>
                                                              ))}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-sm text-muted-foreground py-4 text-center">
                                                ไม่มีรายละเอียดการแทง
                                              </div>
                                            )}
                                          </div>

                                          {/* FIXED: Status History */}
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              ประวัติการเปลี่ยนแปลงสถานะ
                                            </h4>
                                            {loadingHistory.has(row.original.id) ? (
                                              <div className="flex items-center justify-center py-4">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                              </div>
                                            ) : (
                                              (() => {
                                                const ticketHistory = statusHistory.filter(h => h.ticket_id === row.original.id);
                                                return ticketHistory.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {ticketHistory.map((history) => (
                                                      <div key={history.id} className="text-xs bg-background p-3 rounded border">
                                                        <div className="flex justify-between items-start">
                                                          <div>
                                                            <span className="font-medium">
                                                              {history.old_status === "pending" ? "รอจ่ายเงิน" :
                                                               history.old_status === "confirmed" ? "จ่ายเงินแล้ว" :
                                                               history.old_status === "cancelled" ? "ยกเลิก" : history.old_status}
                                                            </span>
                                                            <span className="mx-2 text-muted-foreground">→</span>
                                                            <span className={`font-medium ${
                                                              history.new_status === "confirmed" ? "text-green-600" :
                                                              history.new_status === "cancelled" ? "text-red-600" : 
                                                              "text-blue-600"
                                                            }`}>
                                                              {history.new_status === "pending" ? "รอจ่ายเงิน" :
                                                               history.new_status === "confirmed" ? "จ่ายเงินแล้ว" :
                                                               history.new_status === "cancelled" ? "ยกเลิก" : history.new_status}
                                                            </span>
                                                          </div>
                                                          <div className="text-muted-foreground text-right">
                                                            {format(new Date(history.changed_at), "d MMM yyyy HH:mm", { locale: th })}
                                                          </div>
                                                        </div>
                                                        {history.username && (
                                                          <div className="text-muted-foreground mt-1">
                                                            โดย: {history.username}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-muted-foreground py-4 text-center">
                                                    ไม่มีประวัติการเปลี่ยนแปลงสถานะ
                                                  </div>
                                                );
                                              })()
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    </TableCell>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={table.getAllColumns().length}
                              className="h-24 text-center"
                            >
                              ไม่พบข้อมูล
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">รายการต่อหน้า</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ย้อนกลับ
                </Button>
                <span className="text-sm text-muted-foreground">หน้า {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={tickets.length < pageSize}
                >
                  ถัดไป
                </Button>
              </div>
            </div>

            {/* Delete Dialog */}
            <AnimatePresence>
              {deleteDialogOpen && (
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>ยืนยันการลบรายการ</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm mb-2">
                      คุณต้องการลบรายการบิลเลขที่ <span className="font-bold">{deletingTicket?.bill_number}</span> หรือไม่?
                      <br />
                      (ข้อมูลจะถูกเก็บไว้อีก 30 วันก่อนลบถาวร)
                    </div>
                    <Input
                      placeholder="เหตุผลในการลบ (ไม่บังคับ)"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="mb-2"
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteTicket}>
                        ยืนยันลบ
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </AnimatePresence>

            {/* Status Edit Dialog */}
            <AnimatePresence>
              {statusEditDialogOpen && (
                <Dialog open={statusEditDialogOpen} onOpenChange={setStatusEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>แก้ไขสถานะรายการ</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm mb-4">
                      <div className="mb-2">
                        เลขบิล: <span className="font-bold">{editingTicket?.bill_number}</span>
                      </div>
                      <div className="mb-2">
                        สถานะปัจจุบัน: <span className="font-bold text-yellow-600">รอจ่ายเงิน</span>
                      </div>
                      <div className="mb-2">
                        เปลี่ยนเป็น:
                      </div>
                    </div>
                    <Select
                      value={newStatus}
                      onValueChange={setNewStatus}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสถานะใหม่" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">จ่ายเงินแล้ว</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setStatusEditDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button 
                        onClick={handleEditStatus}
                        disabled={!newStatus}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        อัปเดตสถานะ
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </AnimatePresence>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}