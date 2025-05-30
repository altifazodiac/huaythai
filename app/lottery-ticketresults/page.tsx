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
                  <BreadcrumbPage>ผลสลากกินแบ่งล่าสุด</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
 <div className="container w-full mx-auto p-2 sm:p-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-none shadow-lg mb-2">
          <CardHeader className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-t-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow">
            <div className="flex items-center gap-2 text-xl font-bold">
              <FaCrown className="text-yellow-300 animate-bounce" />
              บิลที่ถูกรางวัล
            </div>
            <div className="text-lg font-semibold mt-2 sm:mt-0 flex items-center">
              <FaCoins className="text-yellow-200 mr-1" />
              ยอดรวมรางวัล: <span className="text-yellow-200 ml-1">{totalPrize.toLocaleString()} ฿</span>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex gap-2 mb-2 flex-wrap">
              <Input placeholder="ค้นหาบิล..." value={filterBill} onChange={e => setFilterBill(e.target.value)} className="w-36 h-8 text-xs" />
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-36 h-8 text-xs" />
            </div>
            {loading ? (
              <div>กำลังโหลด...</div>
            ) : filteredWinningTickets.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-xs">ไม่พบบิลที่ถูกรางวัล</div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredWinningTickets.map((win, idx) => {
                  const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
                  let paidAtThai = "";
                  if (billInfo?.paid_at) {
                    const zoned = toZonedTime(new Date(billInfo.paid_at), "Asia/Bangkok");
                    paidAtThai = format(zoned, "d MMM yyyy HH:mm", { locale: th });
                  }
                  return (
                    <motion.div key={win.bill_number} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                      <Card className="w-full border border-green-200 shadow-sm text-xs">
                        <CardHeader className="bg-green-50 border-b border-green-200 p-2 rounded-t-md flex flex-col gap-1">
                          <div className="flex flex-wrap justify-between items-center">
                            <span className="font-bold text-green-700">{win.items[0]?.lottery_sub_types?.sub_type_name || '-'}</span>
                            <span className="font-bold text-green-700 truncate">บิล: {win.bill_number} | {win.bill_name || '-'}</span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center text-gray-600">
                            <span>งวด: {format(new Date(win.draw_date), 'd MMM yyyy', { locale: th })}</span>
                            <span>เวลา: {win.draw_time || '-'}</span>
                          </div>
                          <div className="font-semibold text-green-700">รวมรางวัลบิลนี้: <span className="text-yellow-600">{win.sum.toLocaleString()} ฿</span></div>
                        </CardHeader>
                        <CardContent className="p-2">
                          <Table className="text-xs w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead>รางวัล</TableHead>
                                <TableHead>เลขที่ออก</TableHead>
                                <TableHead>เลขที่ซื้อถูก</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>ราคาจ่าย</TableHead>
                                <TableHead>จำนวนเงินที่ซื้อ</TableHead>
                                <TableHead>รางวัลที่ได้</TableHead>
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
                                  <TableRow key={item.id + '-' + idx2} className="bg-green-50/50">
                                    <TableCell className="font-bold text-green-700">{icon}<Badge variant='outline'>{item.prize_code}</Badge></TableCell>
                                    <TableCell>
                                      {isTod || isWing ? (
                                        <Badge className="bg-pink-500 text-white">{matchedNumbers.join(', ')}</Badge>
                                      ) : (
                                        <Badge className="bg-pink-500 text-white">{item.result.winning_number}</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-pink-600 font-bold">{item.winning_number}</TableCell>
                                    <TableCell>{item.lottery_sub_number?.type_number || '-'}</TableCell>
                                    <TableCell>{item.lottery_sub_number?.price_paid || '-'}</TableCell>
                                    <TableCell>{item.amount?.toLocaleString()} ฿</TableCell>
                                    <TableCell className="flex items-center text-yellow-700 font-bold"><FaMoneyBillWave className="mr-1" />+{item.prize.toLocaleString()} ฿</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          <div className="flex justify-end mt-2">
                            {billInfo?.status === 'pending' ? (
                              <Button
                                color="yellow"
                                disabled={statusLoading === win.bill_number}
                                onClick={async () => {
                                  setStatusLoading(win.bill_number);
                                  await supabase.from('lottery_winning_bills')
                                    .update({ status: 'paid', paid_at: thaiNow })
                                    .eq('bill_number', win.bill_number);
                                  const { data } = await supabase.from('lottery_winning_bills').select('*');
                                  setWinningBills(data || []);
                                  setStatusLoading(null);
                                }}
                              >
                                {statusLoading === win.bill_number ? 'กำลังอัปเดต...' : 'รอจ่าย'}
                              </Button>
                            ) : (
                              <Button color="green" disabled>
                                จ่ายแล้ว {paidAtThai}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
    </SidebarInset>
    </SidebarProvider>
    </DirectionProvider>
  );
} 