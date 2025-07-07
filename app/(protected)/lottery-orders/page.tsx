"use client";
import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PrinterIcon, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";
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
  Column,
  Table as TableType,
} from "@tanstack/react-table";
import { TableVirtuoso, TableVirtuosoProps } from "react-virtuoso";
import { CSVLink } from "react-csv";
import { useReactToPrint } from "react-to-print";
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
  lottery_ticket_items: LotteryTicketItem[];
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
  pageSize: number
): Promise<LotteryTicket[]> => {
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
    .is("deleted_at", null)
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order("created_at", { ascending: false });

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

// CSV Data Preparation
const prepareCsvData = (tickets: LotteryTicket[]) => {
  const headers = [
    { label: "เลขบิล", key: "bill_number" },
    { label: "ประเภทหวย", key: "sub_type_name" },
    { label: "ผู้ใช้", key: "username" },
    { label: "วันที่ออกรางวัล", key: "draw_date" },
    { label: "วันที่ซื้อ", key: "created_at" },
    { label: "ยอดรวม (฿)", key: "total_amount" },
    { label: "เงินรางวัล (฿)", key: "payout_amount" },
    { label: "สถานะ", key: "status" },
    { label: "รายละเอียดการแทง", key: "bet_details" },
  ];

  const data = tickets.map((ticket) => {
    const groups = createGroups(ticket.lottery_ticket_items);
    const betDetails = Array.from(groups.values())
      .map((group) => {
        return `${group.digit_number} ตัว: ${group.numbers.join(", ")} (${group.typeLabels.join(" x ")}: ${group.typeLabels
          .map((label) => group.amounts[label] || 0)
          .join(" x ")})`;
      })
      .join("; ");
    return {
      bill_number: ticket.bill_number,
      sub_type_name: ticket.lottery_ticket_items[0]?.lottery_sub_types?.sub_type_name || "-",
      username: ticket.username || "-",
      draw_date: `${format(new Date(ticket.draw_date), "d MMM yyyy", { locale: th })} ${ticket.draw_time}`,
      created_at: format(new Date(ticket.created_at), "d MMM yyyy HH:mm", { locale: th }),
      total_amount: ticket.total_amount.toLocaleString(),
      payout_amount: ticket.payout_amount.toLocaleString(),
      status: { confirmed: "ยืนยันแล้ว", pending: "รอดำเนินการ", cancelled: "ยกเลิก" }[ticket.status] || ticket.status,
      bet_details: betDetails,
    };
  });

  return { headers, data };
};

// Print Preview Component
const PrintPreview = React.forwardRef<
  HTMLDivElement,
  { ticket: LotteryTicket | null }
>(({ ticket }, ref) => {
  if (!ticket) return null;
  const groups = createGroups(ticket.lottery_ticket_items);
  return (
    <div ref={ref} className="p-6 bg-white">
      <h2 className="text-xl font-bold mb-4">บิลหวย: {ticket.bill_number}</h2>
      <p>ประเภทหวย: {ticket.lottery_ticket_items[0]?.lottery_sub_types?.sub_type_name || "-"}</p>
      <p>ผู้ใช้: {ticket.username || "-"}</p>
      <p>วันที่ออกรางวัล: {format(new Date(ticket.draw_date), "d MMM yyyy", { locale: th })} {ticket.draw_time}</p>
      <p>วันที่ซื้อ: {format(new Date(ticket.created_at), "d MMM yyyy HH:mm", { locale: th })}</p>
      <p>ยอดรวม: {ticket.total_amount.toLocaleString()} ฿</p>
      <p>เงินรางวัล: {ticket.payout_amount.toLocaleString()} ฿</p>
      <p>สถานะ: {{ confirmed: "ยืนยันแล้ว", pending: "รอดำเนินการ", cancelled: "ยกเลิก" }[ticket.status] || ticket.status}</p>
      <h3 className="text-lg font-semibold mt-4">รายละเอียดการแทง</h3>
      {Array.from(groups.values()).map((group, idx) => (
        <div key={idx} className="mb-2">
          <p>{group.digit_number} ตัว: {group.numbers.join(", ")}</p>
          <p>{group.typeLabels.join(" x ")}: {group.typeLabels.map((label) => group.amounts[label] || 0).join(" x ")}</p>
          <p>รวม: {group.typeLabels.reduce((sum: number, label: string) => sum + (group.amounts[label] || 0) * group.numbers.length, 0).toLocaleString()} ฿</p>
        </div>
      ))}
    </div>
  );
});
PrintPreview.displayName = "PrintPreview";

// Columns Definition
const createColumns = (
  onPrintClick: (billNumber: string) => Promise<void>,
  setDeletingTicket: (ticket: LotteryTicket | null) => void,
  setDeleteDialogOpen: (open: boolean) => void,
  setPrintPreviewTicket: (ticket: LotteryTicket | null) => void
): ColumnDef<LotteryTicket>[] => [
  {
    accessorKey: "bill_number",
    header: ({ column }: { column: Column<LotteryTicket> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        aria-label="เรียงลำดับตามเลขบิล"
      >
        เลขบิล
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) => (
      <div className="font-medium">{row.original.bill_number}</div>
    ),
  },
  {
    accessorKey: "sub_type_name",
    header: "ประเภทหวย",
    cell: ({ row }: { row: Row<LotteryTicket> }) =>
      row.original.lottery_ticket_items[0]?.lottery_sub_types?.sub_type_name || "-",
  },
  {
    accessorKey: "username",
    header: "ผู้ใช้",
    cell: ({ row }: { row: Row<LotteryTicket> }) => row.original.username || "-",
    enableHiding: true,
  },
  {
    accessorKey: "draw_date",
    header: ({ column }: { column: Column<LotteryTicket> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        aria-label="เรียงลำดับตามวันที่ออกรางวัล"
      >
        วันที่ออกรางวัล
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) =>
      `${format(new Date(row.original.draw_date), "d MMM yyyy", { locale: th })} ${row.original.draw_time}`,
  },
  {
    accessorKey: "created_at",
    header: ({ column }: { column: Column<LotteryTicket> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        aria-label="เรียงลำดับตามวันที่ซื้อ"
      >
        วันที่ซื้อ
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }: { row: Row<LotteryTicket> }) =>
      format(new Date(row.original.created_at), "d MMM yyyy HH:mm", { locale: th }),
  },
  {
    accessorKey: "total_amount",
    header: "ยอดรวม (฿)",
    cell: ({ row }: { row: Row<LotteryTicket> }) => row.original.total_amount.toLocaleString(),
  },
  {
    accessorKey: "payout_amount",
    header: "เงินรางวัล (฿)",
    cell: ({ row }: { row: Row<LotteryTicket> }) => row.original.payout_amount.toLocaleString(),
  },
  {
    accessorKey: "status",
    header: "สถานะ",
    cell: ({ row }: { row: Row<LotteryTicket> }) => {
      const status = row.original.status;
      const statusStyles: Record<string, string> = {
        confirmed: "text-green-600",
        pending: "text-yellow-600",
        cancelled: "text-red-600",
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPrintPreviewTicket(row.original)}
          aria-label={`ดูตัวอย่างการพิมพ์บิล ${row.original.bill_number}`}
        >
          <PrinterIcon className="mr-1 h-4 w-4" />
          ตัวอย่าง
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPrintClick(row.original.bill_number)}
          aria-label={`พิมพ์บิล ${row.original.bill_number}`}
        >
          <PrinterIcon className="mr-1 h-4 w-4" />
          พิมพ์
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            setDeletingTicket(row.original);
            setDeleteDialogOpen(true);
          }}
          aria-label={`ลบบิล ${row.original.bill_number}`}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          ลบ
        </Button>
      </div>
    ),
  },
];

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
    const amountsArr = labelOrder.map((lab: string) => {
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
        amounts: Object.fromEntries(labelOrder.map((lab: string, idx: number) => [lab, amountsArr[idx]])),
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

// Virtuoso Table Components
const VirtuosoComponents: TableVirtuosoProps<LotteryTicket, { expandedRows: Set<number>; setExpandedRows: React.Dispatch<React.SetStateAction<Set<number>>>; table: TableType<LotteryTicket> }>['components'] = {
  Table: ({ context, ...props }) => (
    <table role="grid" {...props} />
  ),
  TableHead: ({ context, ...props }) => (
    <thead {...props} />
  ),
  TableBody: ({ context, ...props }) => (
    <tbody {...props} />
  ),
  TableRow: ({ item, context, ...props }) => {
    const { expandedRows, setExpandedRows, table } = context!;
    const row = table.getRowModel().rows.find(r => r.original.id === item.id);
    if (!row) return null;
    const groups = createGroups(row.original.lottery_ticket_items);
    const isExpanded = expandedRows.has(row.original.id);
    return (
      <>
        <tr
          {...props}
          onClick={() => {
            setExpandedRows((prev: Set<number>) => {
              const newSet = new Set(prev);
              if (newSet.has(row.original.id)) {
                newSet.delete(row.original.id);
              } else {
                newSet.add(row.original.id);
              }
              return newSet;
            });
          }}
          className="cursor-pointer hover:bg-gray-50"
        >
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={table.getAllColumns().length}>
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-semibold mb-2">รายละเอียดการแทง</h4>
                {Array.from(groups.values()).map((group, idx) => (
                  <div key={idx} className="flex gap-4 mb-2">
                    <div className="w-24">
                      <div className="text-xs">{group.digit_number} ตัว</div>
                      <div className="text-xs text-blue-600">{group.typeLabels.join(" x ")}</div>
                      <div className="text-xs">{group.typeLabels.map((label: string) => group.amounts[label] || 0).join(" x ")}</div>
                      <div className="text-xs text-gray-500">
                        รวม{" "}
                        {group.typeLabels
                          .reduce((sum: number, label: string) => sum + (group.amounts[label] || 0) * group.numbers.length, 0)
                          .toLocaleString()} ฿
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs bg-white p-2 rounded border">{group.numbers.join("  ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  },
};

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
  const [printPreviewTicket, setPrintPreviewTicket] = useState<LotteryTicket | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent Hydration Mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch user data
  useEffect(() => {
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
  useEffect(() => {
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
  const { data: tickets = [], isLoading } = useQuery<LotteryTicket[]>({
    queryKey: ["lottery_tickets", user?.id, role, filters, page, pageSize],
    queryFn: () => fetchTickets(supabase, user, role, filters, page, pageSize),
    enabled: !!user && isMounted,
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

  // Print Preview handler
  const handlePrintPreview = useReactToPrint({
    ...( {
      content: () => printRef.current,
      documentTitle: `บิลหวย_${printPreviewTicket?.bill_number || "preview"}`,
      onAfterPrint: () => setPrintPreviewTicket(null),
    } as any )
  });

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
        .from("delete.0history")
        .insert({
          ticket_id: deletingTicket.id,
          user_id: user.id,
          reason: deleteReason,
          deleted_at: new Date().toISOString(),
        });
      toast.success("ลบรายการสำเร็จ (จะถูกลบถาวรใน 30 วันก่อนลบถาวร)");
      setDeleteDialogOpen(false);
      setDeletingTicket(null);
      setDeleteReason("");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ: " + error.message);
    }
  };

  // TanStack Table
  const table = useReactTable({
    data: tickets,
    columns: createColumns(onPrintClick, setDeletingTicket, setDeleteDialogOpen, setPrintPreviewTicket),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
    },
  });

  // CSV Data
  const { headers: csvHeaders, data: csvData } = prepareCsvData(tickets);

  // Handle Export CSV
  const handleExportClick = () => {
    if (!csvData.length) {
      toast.error("ไม่มีข้อมูลสำหรับดาวน์โหลด");
      return;
    }
  };

  if (!isMounted || isLoading) {
    return (
      <DirectionProvider dir="ltr">
        <SidebarProvider>
          <SidebarInset>
            <div className="flex items-center justify-center h-screen">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
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
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <Input
                    placeholder="ค้นหาเลขบิล"
                    value={filters.billNumber}
                    onChange={(e) => setFilters({ ...filters, billNumber: e.target.value })}
                    className="w-40"
                    aria-label="ค้นหาเลขบิล"
                  />
                  <Input
                    type="date"
                    value={filters.drawDate}
                    onChange={(e) => setFilters({ ...filters, drawDate: e.target.value })}
                    className="w-40"
                    aria-label="ค้นหาตามวันที่ออกรางวัล"
                  />
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="w-40" aria-label="เลือกสถานะ">
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
                      aria-label="ค้นหาชื่อผู้ใช้"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ billNumber: "", drawDate: "", status: "all", username: "" })}
                    aria-label="ล้างตัวกรอง"
                  >
                    ล้างตัวกรอง
                  </Button>
                  <CSVLink
                    data={csvData}
                    headers={csvHeaders}
                    filename={`lottery_tickets_${format(new Date(), "yyyy-MM-dd")}.csv`}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                    aria-label="ดาวน์โหลด CSV"
                    onClick={handleExportClick}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Export CSV
                  </CSVLink>
                </div>
              </CardContent>
            </Card>

            {/* Virtualized Table */}
            <Card>
              <CardContent className="p-0">
                <TableVirtuoso
                  style={{ height: 600 }}
                  data={tickets}
                  totalCount={tickets.length}
                  context={{ expandedRows, setExpandedRows, table }}
                  components={VirtuosoComponents}
                  fixedHeaderContent={() => (
                    <>
                      {table.getHeaderGroups().map((headerGroup: HeaderGroup<LotteryTicket>) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header: Header<LotteryTicket, unknown>) => (
                            <th key={header.id}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                  aria-label="เลือกจำนวนรายการต่อหน้า"
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
                <span className="text-sm text-gray-500">รายการต่อหน้า</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="ไปหน้าที่แล้ว"
                >
                  ย้อนกลับ
                </Button>
                <span className="text-sm text-gray-500">หน้า {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={tickets.length < pageSize}
                  aria-label="ไปหน้าถัดไป"
                >
                  ถัดไป
                </Button>
              </div>
            </div>

            {/* Delete Dialog */}
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
                  aria-label="เหตุผลในการลบ"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} aria-label="ยกเลิกการลบ">
                    ยกเลิก
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteTicket} aria-label="ยืนยันการลบ">
                    ยืนยันลบ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Print Preview Dialog */}
            <Dialog open={!!printPreviewTicket} onOpenChange={() => setPrintPreviewTicket(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>ตัวอย่างการพิมพ์: {printPreviewTicket?.bill_number}</DialogTitle>
                </DialogHeader>
                <PrintPreview ref={printRef} ticket={printPreviewTicket} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPrintPreviewTicket(null)} aria-label="ปิดตัวอย่างการพิมพ์">
                    ปิด
                  </Button>
                  <Button onClick={handlePrintPreview} aria-label="พิมพ์ตัวอย่าง">
                    พิมพ์
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}