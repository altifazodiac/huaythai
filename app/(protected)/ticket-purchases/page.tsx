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
import { format } from "date-fns";
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
  id: number;
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
  id: number;
  ticket_id: number;
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

// Fetch Tickets Function
const fetchTickets = async (
  supabase: any,
  user: any,
  role: string,
  filters: { billNumber: string; drawDate: string; status: string; username: string },
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
  if (filters.drawDate) {
    query = query.eq("draw_date", filters.drawDate);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.username && role === "admin") {
    query = query.ilike("username", `%${filters.username}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Fetch Status History Function
const fetchStatusHistory = async (supabase: any, ticketId: number) => {
  const { data, error } = await supabase
    .from("status_change_history")
    .select(`
      *,
      profiles:user_id(username)
    `)
    .eq("ticket_id", ticketId)
    .order("changed_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Columns Definition
const createColumns = (
  onPrintClick: (billNumber: string) => Promise<void>,
  setDeletingTicket: (ticket: LotteryTicket | null) => void,
  setDeleteDialogOpen: (open: boolean) => void,
  onRestoreClick: (ticket: LotteryTicket) => Promise<void>,
  showDeleted: boolean,
  onEditStatusClick: (ticket: LotteryTicket) => void
): ColumnDef<LotteryTicket>[] => [
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
        {row.original.bill_number}
        {row.original.deleted_at && <span className="ml-2 text-xs text-red-500">(ลบแล้ว)</span>}
      </div>
    ),
  },
  {
    accessorKey: "sub_type_name",
    header: "ประเภทหวย",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {row.original.lottery_ticket_items[0]?.lottery_sub_types?.sub_type_name || "-"}
      </span>
    ),
  },
  {
    accessorKey: "bill_name",
    header: "ชื่อบิล",
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {row.original.bill_name || "-"}
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
        {`${format(new Date(row.original.draw_date), "d MMM yyyy", { locale: th })} ${row.original.draw_time}`}
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
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <span className={row.original.deleted_at ? "text-gray-400" : ""}>
        {(row.original.total_amount ?? 0).toLocaleString()}
      </span>
    ),
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
        confirmed: "ยืนยันแล้ว",
        pending: "รอดำเนินการ",
        cancelled: "ยกเลิก",
      };
      return <span className={statusStyles[status] || "text-gray-600"}>{statusText[status] || status}</span>;
    },
  },
  {
    id: "actions",
    header: "การดำเนินการ",
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
    drawDate: "",
    status: "",
    username: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<LotteryTicket | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showDeleted, setShowDeleted] = useState(false);
  const [statusEditDialogOpen, setStatusEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<LotteryTicket | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusHistory, setStatusHistory] = useState<StatusChangeHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<Set<number>>(new Set());

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

  // Group Bet Details
  const createGroups = (ticketItems: LotteryTicketItem[]) => {
    const allTypeLabels: Record<number, string[]> = {};
    ticketItems.forEach((item) => {
      const label = item.lottery_sub_number.type_number || "-";
      if (!allTypeLabels[item.lottery_sub_number.digit_number]) {
        allTypeLabels[item.lottery_sub_number.digit_number] = [];
      }
      if (!allTypeLabels[item.lottery_sub_number.digit_number].includes(label)) {
        allTypeLabels[item.lottery_sub_number.digit_number].push(label);
      }
    });

    Object.keys(allTypeLabels).forEach((digit) => {
      if ([3, 4].includes(Number(digit))) {
        const labels = allTypeLabels[Number(digit)];
        allTypeLabels[Number(digit)] = ["เต็ง", "โต๊ด"].filter((l) => labels.includes(l)).length > 0 ? ["เต็ง", "โต๊ด"] : labels;
      } else if (Number(digit) === 2) {
        const labels = allTypeLabels[Number(digit)];
        allTypeLabels[Number(digit)] = ["บน", "ล่าง"].filter((l) => labels.includes(l)).length > 0 ? ["บน", "ล่าง"] : labels;
      }
    });

    const groups: Map<string, Grouped> = new Map();
    ticketItems.forEach((item) => {
      const digit = item.lottery_sub_number.digit_number;
      const labelOrder = allTypeLabels[digit] || [item.lottery_sub_number.type_number || "-"];
      const amountsArr = labelOrder.map((lab) => {
        const found = ticketItems.find(
          (t) =>
            t.lottery_sub_number.digit_number === digit &&
            t.lottery_sub_number.type_number === lab &&
            t.numbers.join(",") === item.numbers.join(",")
        );
        return found ? found.amount : 0;
      });
      const key = `${digit}|${labelOrder.join(",")}|${amountsArr.join(",")}`;
      if (!groups.has(key)) {
        groups.set(key, {
          digit_number: digit,
          numbers: [],
          typeLabels: labelOrder,
          amounts: Object.fromEntries(labelOrder.map((lab, idx) => [lab, amountsArr[idx]])),
          typeOrder: labelOrder,
        });
      }
      const group = groups.get(key)!;
      item.numbers.forEach((num) => {
        if (!group.numbers.includes(num)) group.numbers.push(num);
      });
    });
    return groups;
  };

  // Load status history when row is expanded
  const handleRowExpand = async (ticketId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
        return newSet;
      } else {
        newSet.add(ticketId);
        // Load status history when expanding
        if (!loadingHistory.has(ticketId)) {
          setLoadingHistory(prev => new Set(prev).add(ticketId));
          fetchStatusHistory(supabase, ticketId)
            .then(history => {
              setStatusHistory(history);
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

  // TanStack Table
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
      }
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
                    <Input
                      type="date"
                      value={filters.drawDate}
                      onChange={(e) => setFilters({ ...filters, drawDate: e.target.value })}
                      className="w-40"
                    />
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="สถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                        <SelectItem value="pending">รอดำเนินการ</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                    {role === "admin" && (
                      <Input
                        placeholder="ค้นหาชื่อผู้ใช้"
                        value={filters.username}
                        onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                        className="w-40"
                      />
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ billNumber: "", drawDate: "", status: "all", username: "" })}
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
                                className="cursor-pointer"
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
                                          {/* Bet Details */}
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              รายละเอียดการแทง
                                            </h4>
                                            {Array.from(
                                              createGroups(row.original.lottery_ticket_items).values()
                                            ).map((group, idx) => (
                                              <div key={idx} className="flex gap-4 mb-2">
                                                <div className="w-24">
                                                  <div className="text-xs">
                                                    {group.digit_number} ตัว
                                                  </div>
                                                  <div className="text-xs text-primary">
                                                    {group.typeLabels.join(" x ")}
                                                  </div>
                                                  <div className="text-xs">
                                                    {group.typeLabels
                                                      .map(
                                                        (label: string) =>
                                                          group.amounts[label] || 0
                                                      )
                                                      .join(" x ")}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    รวม{" "}
                                                    {group.typeLabels
                                                      .reduce(
                                                        (sum: number, label: string) =>
                                                          sum +
                                                          (group.amounts[label] || 0) *
                                                            group.numbers.length,
                                                        0
                                                      )
                                                      .toLocaleString()}{" "}
                                                    ฿
                                                  </div>
                                                </div>
                                                <div className="flex-1">
                                                  <div className="text-xs bg-background p-2 rounded border border-border">
                                                    {group.numbers
                                                      .map((num) =>
                                                        typeof num === "string"
                                                          ? num.replace(/[\[\]"]+/g, "") // ลบ [, ], "
                                                          : num
                                                      )
                                                      .join("  ")}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Status History */}
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              ประวัติการเปลี่ยนแปลงสถานะ
                                            </h4>
                                            {loadingHistory.has(row.original.id) ? (
                                              <div className="flex items-center justify-center py-4">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                              </div>
                                            ) : statusHistory.length > 0 ? (
                                              <div className="space-y-2">
                                                {statusHistory.map((history) => (
                                                  <div key={history.id} className="text-xs bg-background p-2 rounded border border-border">
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <span className="font-medium">
                                                          {history.old_status === "pending" ? "รอดำเนินการ" :
                                                           history.old_status === "confirmed" ? "ยืนยันแล้ว" :
                                                           history.old_status === "cancelled" ? "ยกเลิก" : history.old_status}
                                                        </span>
                                                        <span className="mx-2">→</span>
                                                        <span className={`font-medium ${
                                                          history.new_status === "confirmed" ? "text-green-600" :
                                                          history.new_status === "cancelled" ? "text-red-600" : ""
                                                        }`}>
                                                          {history.new_status === "pending" ? "รอดำเนินการ" :
                                                           history.new_status === "confirmed" ? "ยืนยันแล้ว" :
                                                           history.new_status === "cancelled" ? "ยกเลิก" : history.new_status}
                                                        </span>
                                                      </div>
                                                      <div className="text-muted-foreground">
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
                                              <div className="text-xs text-muted-foreground py-2">
                                                ไม่มีประวัติการเปลี่ยนแปลงสถานะ
                                              </div>
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
                        สถานะปัจจุบัน: <span className="font-bold text-yellow-600">รอดำเนินการ</span>
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
                        <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
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