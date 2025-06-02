"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { FaCrown, FaMedal, FaRandom, FaRunning, FaMoneyBillWave, FaCoins } from 'react-icons/fa';
import { Button } from "@/components/ui/button";
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
import { toZonedTime } from "date-fns-tz";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
interface LotteryTicketItem {
  id: string;
  ticket_id: string;
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
  draw_date: string;
  bill_number: string;
  bill_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  lottery_ticket_items: LotteryTicketItem[];
}
interface LotteryResult {
  id: number;
  lottery_type_id: number;
  lottery_sub_type_id: number;
  schedule_id: number;
  draw_date: string;
  draw_time: string;
  prize_code: string;
  winning_number: string;
  created_at: string;
  updated_at: string;
  lottery_sub_types: LotterySubType;
}

export default function LotteryTicketResultsPage() {
  useRequireAuth();
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBill, setFilterBill] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [winningBills, setWinningBills] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: ticketsData } = await supabase
        .from("lottery_tickets")
        .select(`*,
          lottery_ticket_items:lottery_ticket_items(*,
            lottery_sub_types:lottery_sub_types(lottery_sub_type_id,sub_type_name),
            lottery_sub_number:lottery_sub_number(id,lottery_sub_type_id,digit_number,type_number,price_paid)
          )
        `)
        .order("created_at", { ascending: false });
      const { data: resultsData } = await supabase
        .from("lottery_results")
        .select(`*,
          lottery_sub_types:lottery_sub_type_id(lottery_sub_type_id,sub_type_name)
        `);
      setTickets(ticketsData || []);
      setResults(resultsData || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Build a map for quick result lookup: {date|sub_type_id|prize_code: result}
  const resultMap = React.useMemo(() => {
    const map: Record<string, LotteryResult> = {};
    for (const res of results) {
      const date = res.draw_date;
      const subTypeId = res.lottery_sub_type_id;
      const prizeCode = res.prize_code;
      if (date && subTypeId && prizeCode) {
        map[`${date}|${subTypeId}|${prizeCode}`] = res;
      }
    }
    return map;
  }, [results]);

  // Find all winning tickets and calculate prize per row
  const { winningTickets, totalPrize } = React.useMemo(() => {
    let totalPrize = 0;
    const wins: {
      bill_number: string;
      bill_name: string;
      draw_date: string;
      draw_time: string;
      ticket_id: string;
      items: (LotteryTicketItem & {
        winning_number: string;
        prize_code: string;
        result: LotteryResult;
        prize: number;
        draw_time: string;
      })[];
      sum: number;
    }[] = [];
    for (const ticket of tickets) {
      if (!ticket.lottery_ticket_items) continue;
      const winItems: (LotteryTicketItem & { winning_number: string; prize_code: string; result: LotteryResult; prize: number; draw_time: string })[] = [];
      for (const item of ticket.lottery_ticket_items) {
        const prizeCode = `${item.lottery_sub_number.digit_number}_${item.lottery_sub_number.type_number}`;
        const resKey = `${ticket.draw_date}|${item.lottery_sub_type_id}|${prizeCode}`;
        const result = resultMap[resKey];
        if (result && result.winning_number && item.numbers) {
          let matchedNumbers: string[] = [];
          // โต๊ด
          if (prizeCode.includes("โต๊ด")) {
            const winningSet = new Set(result.winning_number.split(",").map(s => s.trim()));
            matchedNumbers = item.numbers.filter(num => winningSet.has(num));
          }
          // วิ่ง
          else if (prizeCode.includes("วิ่ง")) {
            const winningSet = new Set(result.winning_number.split(",").map(s => s.trim()));
            matchedNumbers = item.numbers.filter(num => winningSet.has(num));
          }
          // ตรง
          else {
            matchedNumbers = item.numbers.filter(num => num === result.winning_number);
          }
          if (matchedNumbers.length > 0) {
            // กรณีซื้อหลายเลขใน 1 รายการ (เช่น 12,21)
            const prize = item.amount * item.lottery_sub_number.price_paid * matchedNumbers.length;
            totalPrize += prize;
            winItems.push({
              ...item,
              winning_number: matchedNumbers.join(", "),
              prize_code: prizeCode,
              result,
              prize,
              draw_time: result.draw_time,
            });
          }
        }
      }
      if (winItems.length > 0) {
        const sum = winItems.reduce((acc, i) => acc + i.prize, 0);
        wins.push({
          bill_number: ticket.bill_number,
          bill_name: ticket.bill_name,
          draw_date: ticket.draw_date,
          draw_time: winItems[0]?.draw_time || '',
          ticket_id: ticket.id,
          items: winItems,
          sum,
        });
      }
    }
    return { winningTickets: wins, totalPrize };
  }, [tickets, resultMap]);

  useEffect(() => {
    supabase.from('lottery_winning_bills').select('*').then(({ data }) => setWinningBills(data || []));
  }, [winningTickets.length]);

  useEffect(() => {
    if (!winningTickets.length) return;
    winningTickets.forEach(async (win) => {
      const ticket = tickets.find(t => t.id === win.ticket_id);
      await supabase.from('lottery_winning_bills').upsert({
        bill_number: win.bill_number,
        bill_name: win.bill_name,
        user_id: ticket?.user_id || '',
        draw_date: win.draw_date,
        total_prize: win.sum,
      }, { onConflict: 'bill_number' });
    });
  }, [winningTickets.length, tickets]);

  const filteredWinningTickets = winningTickets.filter(win => {
    if (filterBill && !win.bill_number.includes(filterBill)) return false;
    if (filterDate && win.draw_date !== filterDate) return false;
    return true;
  });

  const thaiNow = toZonedTime(new Date(), 'Asia/Bangkok').toISOString();

  return (
    <DirectionProvider dir="ltr">
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-8 sm:h-10 shrink-0 items-center gap-1 px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-8">
          <div className="flex items-center gap-1 px-2">
            <SidebarTrigger className="-ml-1 scale-90" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-3" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/" className="text-xs">แดชบอร์ด</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs">รายการที่ถูกรางวัล</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex justify-center w-full min-h-[calc(100vh-40px)] items-start bg-[#f7fafd]">
          <div className="w-full   px-1 sm:px-0 mt-2 space-y-2">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="rounded-xl shadow border-none bg-white">
                <CardHeader
                  className="relative overflow-hidden rounded-t-xl p-4"
                  style={{
                    background: 'linear-gradient(120deg, #1e3c72, #2a5298, #6a11cb, #2575fc)',
                    animation: 'gradientBG 8s ease-in-out infinite',
                    boxShadow: '0 4px 32px 0 rgba(30,60,114,0.15)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/60 to-blue-400/40 animate-gradient-move z-0" />
                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FaCrown className="text-yellow-300 text-2xl drop-shadow-glow" />
                      <span className="text-lg font-bold tracking-wide text-white drop-shadow">บิลที่ถูกรางวัล</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <Input placeholder="ค้นหาบิล..." value={filterBill} onChange={e => setFilterBill(e.target.value)} className="rounded-full bg-white/20 border-none text-white placeholder:text-white/70 shadow-inner focus:ring-2 focus:ring-yellow-300" />
                      <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="rounded-full bg-white/20 border-none text-white placeholder:text-white/70 shadow-inner focus:ring-2 focus:ring-yellow-300" />
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full px-4 py-2 shadow-lg border-2 border-white/30">
                      <FaCoins className="text-yellow-200 text-xl animate-bounce" />
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-white/80">ยอดรวมรางวัล</span>
                        <span className="text-lg font-bold text-white drop-shadow">{totalPrize.toLocaleString()} ฿</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 bg-white rounded-b-xl">
                  {loading ? (
                    <div className="text-xs">กำลังโหลด...</div>
                  ) : filteredWinningTickets.length === 0 ? (
                    <div className="text-center text-muted-foreground py-2 text-xs">ไม่พบบิลที่ถูกรางวัล</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredWinningTickets.map((win, idx) => {
                        const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
                        let paidAtThai = "";
                        if (billInfo?.paid_at) {
                          const zoned = toZonedTime(new Date(billInfo.paid_at), "Asia/Bangkok");
                          paidAtThai = format(zoned, "d MMM yyyy HH:mm", { locale: th });
                        }
                        // Responsive: use Collapsible for each bill
                        return (
                          <Collapsible key={win.bill_number} className="w-full">
                            <div className="flex flex-col sm:flex-row items-center w-full bg-[#17469c]/90 rounded-lg px-2 py-1 gap-1 text-white text-xs cursor-pointer">
                              <CollapsibleTrigger asChild>
                                <button className="flex flex-1 items-center gap-2 w-full text-left focus:outline-none">
                                  <FaCrown className="text-yellow-300 text-base" />
                                  <span className="font-bold truncate max-w-[80px]">{win.items[0]?.lottery_sub_types?.sub_type_name || '-'}</span>
                                  <span className="truncate max-w-[80px]">บิล: {win.bill_number}</span>
                                  <span className="truncate max-w-[60px]">{win.bill_name || '-'}</span>
                                  <span className="hidden sm:inline">ซื้อ: {format(new Date(win.items[0]?.result?.created_at || win.draw_date), 'd MMM', { locale: th })}</span>
                                  <span>งวด: {format(new Date(win.draw_date), 'd MMM', { locale: th })}</span>
                                  <span className="text-yellow-200 font-bold">+{win.sum.toLocaleString()} ฿</span>
                                </button>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-1 ml-auto">
                                {billInfo?.status === 'pending' ? (
                                  <Button
                                    className="bg-[#17469c] hover:bg-[#0e357a] text-white rounded-full px-3 py-1 shadow font-semibold text-xs h-6 min-w-0"
                                    disabled={statusLoading === win.bill_number}
                                    onClick={async () => {
                                      setStatusLoading(win.bill_number);
                                      // 1. Update winning_bills status
                                      await supabase.from('lottery_winning_bills')
                                        .update({ status: 'paid', paid_at: thaiNow })
                                        .eq('bill_number', win.bill_number);
                                      // 2. Update credit_balance & insert credit_transactions
                                      const ticket = tickets.find(t => t.id === win.ticket_id);
                                      if (ticket?.user_id) {
                                        // ดึงเครดิตล่าสุด
                                        const { data: profile } = await supabase
                                          .from('profiles')
                                          .select('credit_balance')
                                          .eq('id', ticket.user_id)
                                          .single();
                                        const currentCredit = profile?.credit_balance ?? 0;
                                        const newCredit = currentCredit + win.sum;
                                        // update credit_balance
                                        await supabase.from('profiles')
                                          .update({ credit_balance: newCredit })
                                          .eq('id', ticket.user_id);
                                        // insert credit_transactions
                                        await supabase.from('credit_transactions').insert([
                                          {
                                            user_id: ticket.user_id,
                                            amount: win.sum,
                                            transaction_type: 'lottery_win',
                                            description: `ถูกรางวัลบิล ${win.bill_number}`,
                                            related_bill_number: win.bill_number,
                                            created_at: thaiNow,
                                          }
                                        ]);
                                        // แจ้ง header ให้รีเฟรชเครดิต
                                        window.dispatchEvent(new Event('credit-updated'));
                                      }
                                      // 3. Refresh winningBills
                                      const { data } = await supabase.from('lottery_winning_bills').select('*');
                                      setWinningBills(data || []);
                                      setStatusLoading(null);
                                    }}
                                  >
                                    {statusLoading === win.bill_number ? 'กำลังอัปเดต...' : 'รอจ่าย'}
                                  </Button>
                                ) : (
                                  <Button className="bg-green-500 text-white rounded-full px-3 py-1 shadow font-semibold text-xs h-6 min-w-0" disabled>
                                    จ่ายแล้ว {paidAtThai}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <CollapsibleContent>
                              <div className="w-full bg-white rounded-b-lg p-2 border-t">
                                <Table className="rounded-xl overflow-x-auto w-full text-xs">
                                  <TableHeader>
                                    <TableRow className="bg-[#17469c]">
                                      <TableHead className="text-white text-xs py-1 px-1">รางวัล</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">เลขที่ออก</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">เลขที่ซื้อถูก</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">ประเภท</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">ราคาจ่าย</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">จำนวนเงินที่ซื้อ</TableHead>
                                      <TableHead className="text-white text-xs py-1 px-1">รางวัลที่ได้</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {win.items.map((item, idx2) => {
                                      const isTod = item.prize_code.includes('โต๊ด');
                                      const isWing = item.prize_code.includes('วิ่ง');
                                      const isStraight = !isTod && !isWing;
                                      const matchedNumbers = item.winning_number.split(',').map(s => s.trim()).filter(Boolean);
                                      let icon = isStraight ? <FaMedal className="text-green-500 mr-1 inline" /> : isTod ? <FaRandom className="text-yellow-500 mr-1 inline" /> : <FaRunning className="text-blue-500 mr-1 inline" />;
                                      return (
                                        <motion.tr
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ duration: 0.3, delay: idx2 * 0.03 }}
                                          key={item.id + '-' + idx2}
                                          className="bg-[#E3EAFD] hover:bg-[#D1DBF5] transition text-xs"
                                        >
                                          <TableCell className="font-bold text-[#17469c] px-1 py-1">{icon}<Badge variant='outline' className="bg-blue-100 text-[#17469c] font-bold rounded-full px-2 py-0.5 shadow text-xs">{item.prize_code}</Badge></TableCell>
                                          <TableCell className="px-1 py-1">
                                            {isTod || isWing ? (
                                              <Badge className="bg-pink-500 text-white text-xs">{matchedNumbers.join(', ')}</Badge>
                                            ) : (
                                              <Badge className="bg-pink-500 text-white text-xs">{item.result.winning_number}</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-pink-600 font-bold px-1 py-1">{item.winning_number}</TableCell>
                                          <TableCell className="px-1 py-1">{item.lottery_sub_number?.type_number || '-'}</TableCell>
                                          <TableCell className="px-1 py-1">{item.lottery_sub_number?.price_paid || '-'}</TableCell>
                                          <TableCell className="px-1 py-1">{item.amount?.toLocaleString()} ฿</TableCell>
                                          <TableCell className="flex items-center text-yellow-700 font-bold px-1 py-1"><FaMoneyBillWave className="mr-1" />+{item.prize.toLocaleString()} ฿</TableCell>
                                        </motion.tr>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </DirectionProvider>
  );
} 