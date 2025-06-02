"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
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
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { PrinterIcon } from "lucide-react";
import { Trash2 } from "lucide-react";
import {
  handlePrint,
  fetchTicketPurchase,
} from "@/lib/lottery-print";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRequireAuth } from "@/hooks/use-require-auth";

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

interface LotteryTicket {
  id: number;
  user_id: string;
  draw_date: string;
  draw_time: string;
  bill_number: string;
  bill_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  lottery_ticket_items: LotteryTicketItem[];
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

interface TicketDisplayItem {
  subType: LotterySubType;
  payout: LotterySubNumber;
  numbers: string[];
  amount: number;
}

type GroupKey = string;
type Grouped = {
  digit_number: number;
  numbers: string[];
  typeLabels: string[];
  amounts: Record<string, number>;
  typeOrder: string[];
};

export default function LotteryPurchasePage() {
  useRequireAuth();
  const router = useRouter();
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");

  // Filter states
  const [filterBillNumber, setFilterBillNumber] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<LotteryTicket | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setRole(roleRow?.role || "user");
    };
    fetchUserRole();
  }, [user, supabase]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  // Fetch lottery tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;
      try {
        setLoading(true);
        let query = supabase
          .from('lottery_tickets')
          .select(`
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
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (role !== "admin") {
          query = query.eq('user_id', user.id);
        }
        if (filterBillNumber) {
          query = query.ilike('bill_number', `%${filterBillNumber}%`);
        }
        if (filterDate) {
          query = query.eq('draw_date', filterDate);
        }
        const { data, error } = await query;
        if (error) throw error;
        setTickets(data || []);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error("ไม่สามารถโหลดข้อมูลตั๋วหวยได้");
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [user, supabase, filterBillNumber, filterDate, role]);

  // Function to create groups from ticket items (same logic as in your original code)
  const createGroups = (ticketItems: TicketDisplayItem[]) => {
    const allTypeLabels: Record<number, string[]> = {};
    
    // Build type labels mapping
    ticketItems.forEach(item => {
      const label = item.payout.type_number || "-";
      if (!allTypeLabels[item.payout.digit_number]) allTypeLabels[item.payout.digit_number] = [];
      if (!allTypeLabels[item.payout.digit_number].includes(label)) {
        allTypeLabels[item.payout.digit_number].push(label);
      }
    });

    // Order labels for specific digit numbers
    Object.keys(allTypeLabels).forEach(digit => {
      if (Number(digit) === 3 || Number(digit) === 4) {
        const labels = allTypeLabels[Number(digit)];
        let ordered = [];
        if (labels.includes("เต็ง") && labels.includes("โต๊ด")) {
          ordered = ["เต็ง", "โต๊ด"];
        } else if (labels.includes("บน") && labels.includes("โต๊ด")) {
          ordered = ["บน", "โต๊ด"];
        } else if (labels.includes("เต็ง")) {
          ordered = ["เต็ง", "โต๊ด"];
        } else if (labels.includes("บน")) {
          ordered = ["บน", "โต๊ด"];
        } else if (labels.includes("โต๊ด")) {
          ordered = ["เต็ง", "โต๊ด"];
        } else {
          ordered = labels;
        }
        allTypeLabels[Number(digit)] = ordered;
      }
    });

    Object.keys(allTypeLabels).forEach(digit => {
      if (Number(digit) === 2) {
        const labels = allTypeLabels[Number(digit)];
        let ordered = [];
        if (labels.includes("บน") && labels.includes("ล่าง")) {
          ordered = ["บน", "ล่าง"];
        } else if (labels.includes("บน")) {
          ordered = ["บน", "ล่าง"];
        } else if (labels.includes("ล่าง")) {
          ordered = ["บน", "ล่าง"];
        } else {
          ordered = labels;
        }
        allTypeLabels[Number(digit)] = ordered;
      }
    });

    // Create groups
    const groups: Map<GroupKey, Grouped> = new Map();
    
    ticketItems.forEach(item => {
      const digit = item.payout.digit_number;
      const labelOrder = allTypeLabels[digit] || [item.payout.type_number || "-"];
      const amountsArr = labelOrder.map(lab => {
        const found = ticketItems.find(t => 
          t.payout.digit_number === digit && 
          t.payout.type_number === lab && 
          t.numbers.join(',') === item.numbers.join(',')
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
      item.numbers.forEach(num => {
        if (!group.numbers.includes(num)) group.numbers.push(num);
      });
    });

    return groups;
  };

  const onPrintClick = async (billNumber: string) => {
    const printToastId = toast.loading("กำลังเตรียมข้อมูลสำหรับพิมพ์...");
    try {
      const purchaseData = await fetchTicketPurchase({ bill_number: billNumber });
      if (purchaseData) {
        // The new printing logic in ticket-print.tsx (newGroupedHtml)
        // does not seem to directly use ticketSubTypes.
        // Passing an empty array for now.
        await handlePrint({
          purchase: purchaseData,
          ticketSubTypes: [], // Placeholder as it's not used by newGroupedHtml
          user: user,
        });
        toast.success("กำลังเปิดหน้าต่างพิมพ์...", { id: printToastId });
      } else {
        toast.error("ไม่พบข้อมูลบิลสำหรับพิมพ์", { id: printToastId });
      }
    } catch (error: any) {
      console.error("Error preparing print data:", error);
      toast.error("เกิดข้อผิดพลาดในการเตรียมพิมพ์: " + error.message, { id: printToastId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'ยืนยันแล้ว';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  // Animation variants for list items
  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Stagger delay for each ticket card
      },
    },
  };

  const ticketItemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const groupContainerVariants = {
    visible: { transition: { staggerChildren: 0.07 } }, // Stagger for groups within a ticket
  };

  const groupItemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.2, ease: "easeOut" } },
  };

  // ฟังก์ชันคำนวณยอดรวมของ group
  const getGroupTotalAmount = (group: Grouped) => {
    // รวมยอดเงินของทุกประเภทใน group คูณจำนวนเลข
    return group.typeLabels.reduce((sum, label) => sum + (group.amounts[label] ?? 0) * group.numbers.length, 0);
  };

  // Soft delete function
  const handleDeleteTicket = async () => {
    if (!deletingTicket || !user) return;
    setLoading(true);
    try {
      // 1. Update deleted_at in lottery_tickets
      const { error } = await supabase
        .from('lottery_tickets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingTicket.id);
      if (error) throw error;
      // 2. Insert into delete_history
      const { error: histError } = await supabase
        .from('delete_history')
        .insert({
          ticket_id: deletingTicket.id,
          user_id: user.id,
          reason: deleteReason,
          deleted_at: new Date().toISOString(),
        });
      if (histError) throw histError;
      toast.success("ลบรายการสำเร็จ (จะถูกลบถาวรใน 30 วัน)");
      setDeleteDialogOpen(false);
      setDeletingTicket(null);
      setDeleteReason("");
      // Refresh tickets
      setTickets((prev) => prev.filter(t => t.id !== deletingTicket.id));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DirectionProvider dir="ltr">
        <SidebarProvider>
          <AppSidebar />
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
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>ตั๋วหวยของฉัน</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto w-full max-w-2xl md:max-w-3xl lg:max-w-4xl px-2 md:px-4 lg:px-6 py-4" // Reduced padding
          >
            {/* Header Card */}
            <Card className="mb-6 shadow-lg border-0"> {/* Reduced margin-bottom */}
              <CardHeader className="h-28 mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-t-lg shadow-md flex flex-col items-center justify-center py-6"> {/* Reduced height, padding, shadow, border-radius */}
                <div className="flex flex-col items-center">
                  <span className="text-3xl md:text-4xl drop-shadow font-extrabold">🎟️</span> {/* Reduced font size */}
                  <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow">ตั๋วหวยของฉัน</h1> {/* Reduced font size */}
                  <span className="text-sm md:text-base text-white/80 font-normal">รายการตั๋วหวยที่ซื้อแล้ว</span> {/* Reduced font size */}
                </div>
              </CardHeader>
            </Card>

            {/* Filter UI */}
            <div className="flex flex-wrap gap-2 mb-4 px-2 md:px-4 lg:px-6">
              <Input
                type="text"
                placeholder="ค้นหาด้วยเลขบิล..."
                value={filterBillNumber}
                onChange={e => setFilterBillNumber(e.target.value)}
                className="w-40 text-xs"
              />
              <Input
                type="date"
                placeholder="ค้นหาด้วยวันที่ออกรางวัล"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-44 text-xs"
              />
              <Button variant="outline" size="sm" onClick={() => { setFilterBillNumber(""); setFilterDate(""); }}>ล้างตัวกรอง</Button>
            </div>

            {/* Tickets List */}
            {tickets.length === 0 ? (
              <Card className="shadow-lg border-0"> {/* Reduced shadow */}
                <CardContent className="py-10"> {/* Reduced padding */}
                  <div className="text-center text-muted-foreground">
                    <p className="text-base">ยังไม่มีตั๋วหวย</p> {/* Reduced font size */}
                    <p className="text-xs mt-1">เริ่มซื้อหวยเพื่อดูรายการที่นี่</p> {/* Reduced font size */}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <motion.div className="space-y-4" variants={listContainerVariants} initial="hidden" animate="visible"> {/* Reduced space, added animation variants */}
                {tickets.map((ticket) => {
                  // Convert ticket items to display format
                  const displayItems: TicketDisplayItem[] = ticket.lottery_ticket_items.map(item => ({
                    subType: item.lottery_sub_types,
                    payout: item.lottery_sub_number,
                    numbers: item.numbers,
                    amount: item.amount
                  }));

                  const groups = createGroups(displayItems);
                  // คำนวณยอดรวมของทุก group ในบิลนี้
                  const billTotal = Array.from(groups.values()).reduce((sum, group) => sum + getGroupTotalAmount(group), 0);

                  return (
                    <motion.div
                      key={ticket.id}
                      variants={ticketItemVariants} // Use ticket item variants
                      className="w-full" // Ensure motion.div takes full width for layout
                    >
                      <Card className="shadow-lg border-0 w-full hover:shadow-xl transition-shadow duration-300"> {/* Reduced shadow, added hover effect */}
                        <CardHeader className="pb-3 pt-4 px-4"> {/* Reduced padding */}
                          <div className="flex justify-between items-start">
                            <div className="flex-grow">
                              <CardTitle className="text-base font-semibold"> {/* Reduced font size */}
                                บิลเลขที่: {ticket.bill_number}
                                {ticket.lottery_ticket_items && ticket.lottery_ticket_items.length > 0 && ticket.lottery_ticket_items[0].lottery_sub_types?.sub_type_name && (
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-2">
                                    ({ticket.lottery_ticket_items[0].lottery_sub_types.sub_type_name})
                                  </span>
                                )}
                                {ticket.bill_name && <span className="text-xs font-normal text-muted-foreground ml-1.5">({ticket.bill_name})</span>}
                              </CardTitle>
                              <div className="text-xs text-muted-foreground mt-0.5"> {/* Reduced font size and margin */}
                                วันที่ออกรางวัล: {format(new Date(ticket.draw_date), 'd MMM yyyy', { locale: th })} เวลา {ticket.draw_time}
                              </div>
                              <div className="text-xs text-muted-foreground"> {/* Reduced font size */}
                                วันที่ซื้อ: {format(new Date(ticket.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <div>
                                <div className={`text-xs font-medium ${getStatusColor(ticket.status)}`}> {/* Reduced font size */}
                                  {getStatusText(ticket.status)}
                                </div>
                                <div className="text-base font-semibold text-green-600 mt-0.5"> {/* Reduced font size and margin */}
                                  {billTotal.toLocaleString()} ฿
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 text-xs px-2 py-1 h-auto"
                                onClick={() => onPrintClick(ticket.bill_number)}
                              >
                                <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
                                พิมพ์
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mt-1 text-xs px-2 py-1 h-auto"
                                onClick={() => { setDeletingTicket(ticket); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                ลบ
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 px-3"> {/* Reduced padding */}
                          <motion.div className="space-y-2" variants={groupContainerVariants}> {/* Reduced space, added animation variants */}
                            <AnimatePresence initial={false}> {/* initial={false} for AnimatePresence with stagger */}
                              {Array.from(groups.values()).map((group, idx) => {
                                const allLabels = group.typeLabels;
                               
                                
                                return (
                                  <motion.div
                                    key={`${ticket.id}-group-${idx}`} // More specific key for AnimatePresence
                                    variants={groupItemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg shadow-sm p-2 md:p-2.5 flex flex-row gap-2 md:gap-3 items-center w-full hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors duration-200" // Reduced padding, gap, adjusted background and hover
                                  >
                                    {/* Left side */}
                                    <div className="flex flex-col justify-center items-center text-center min-w-[50px] max-w-[80px] flex-shrink-0"> {/* Reduced width */}
                                      <div className="text-[11px] md:text-xs font-medium leading-tight break-words">{group.digit_number} ตัว</div> {/* Reduced font size */}
                                      <div className="text-[11px] md:text-xs text-red-600 dark:text-red-500 leading-tight break-words"> {/* Reduced font size */}
                                        {allLabels.length > 0 && allLabels.join(" x ")}
                                      </div>
                                      <div className="text-[11px] md:text-xs leading-tight break-words"> {/* Reduced font size */}
                                        {allLabels.map((label) => group.amounts[label] ?? 0).join(" x ")}
                                      </div>
                                      <div className="text-[10px] md:text-xs text-gray-400 break-words">รวม  {getGroupTotalAmount(group).toLocaleString()} ฿</div>
                                    </div>
                                    {/* Right side */}
                                    <div className="flex items-center w-full h-auto min-h-10 max-h-32 overflow-y-auto">
                                      <Textarea
                                        value={group.numbers.join("  ")} // Added more space between numbers for readability
                                        readOnly
                                        rows={1} // Reduced rows, rely on scroll if many numbers
                                        className="rounded-md p-1.5 w-full h-auto min-h-8 max-h-24 text-[11px] md:text-xs leading-tight resize-none bg-white dark:bg-zinc-700/60 border-zinc-200 dark:border-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500" // Reduced padding, font size, height, added border and focus style
                                        style={{ textAlign: "left", wordBreak: "break-all", whiteSpace: "pre-wrap" }} // Ensure break-all for long number strings
                                      />
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ยืนยันการลบรายการ</DialogTitle>
                </DialogHeader>
                <div className="text-sm mb-2">คุณต้องการลบรายการบิลเลขที่ <span className="font-bold">{deletingTicket?.bill_number}</span> หรือไม่?<br/> (ข้อมูลจะถูกเก็บไว้อีก 30 วันก่อนลบถาวร)</div>
                <Input
                  type="text"
                  placeholder="เหตุผลในการลบ (ไม่บังคับ)"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="mb-2"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
                  <Button variant="destructive" onClick={handleDeleteTicket}>ยืนยันลบ</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}