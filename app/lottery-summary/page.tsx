"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarIcon, SearchIcon, FilterIcon, XIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { useRequireAuth } from "@/hooks/use-require-auth";


interface LotteryTicket {
  bill_number: string;
  draw_date: string;
  total_amount: number;
  lottery_winning_bills: Array<{
    total_prize: number;
  }> | null;
}

interface LotterySummaryItem {
  bill_number: string;
  draw_date: string; // ISO date string e.g., "2023-10-27"
  total_amount: number;
  total_prize: number;
}

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LotteryQueryResult {
  bill_number: string;
  draw_date: string;
  total_amount: number;
  lottery_winning_bills: Array<{
    total_prize: number;
  }> | null;
}
  const fetchLotteryData = async (): Promise<LotterySummaryItem[]> => {
  try {
    // Fetch tickets
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('lottery_tickets')
      .select('bill_number, draw_date, total_amount');

    if (ticketsError) {
      console.error('Supabase tickets error:', ticketsError);
      throw ticketsError;
    }

    // Fetch winnings
    const { data: winnings, error: winningsError } = await supabaseClient
      .from('lottery_winning_bills')
      .select('bill_number, draw_date, total_prize');

    if (winningsError) {
      console.error('Supabase winnings error:', winningsError);
      throw winningsError;
    }

    // Join in JS
    return (tickets || []).map(ticket => {
      const win = (winnings || []).find(
        w => w.bill_number === ticket.bill_number && w.draw_date === ticket.draw_date
      );
      return {
        bill_number: ticket.bill_number,
        draw_date: ticket.draw_date,
        total_amount: ticket.total_amount || 0,
        total_prize: win?.total_prize || 0,
      };
    });
  } catch (err) {
    console.error('Detailed error:', err);
    throw new Error('Failed to fetch lottery data');
  }
};
const LotterySummaryPage: React.FC = () => {
  const [lotteryData, setLotteryData] = useState<LotterySummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [billNumberFilter, setBillNumberFilter] = useState<string>('');
  const [drawDateFilter, setDrawDateFilter] = useState<string>('');
  const [minAmountFilter, setMinAmountFilter] = useState<string | number>('');
  const [maxAmountFilter, setMaxAmountFilter] = useState<string | number>('');
  const [minPrizeFilter, setMinPrizeFilter] = useState<string | number>('');
  const [maxPrizeFilter, setMaxPrizeFilter] = useState<string | number>('');
 
  useRequireAuth();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    fetchLotteryData()
      .then(data => {
        setLotteryData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Component error:', err);
        setError('Failed to fetch lottery data. Please try again later.');
        setIsLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    return lotteryData.filter(item => {
      const billNumberMatch = billNumberFilter ? item.bill_number.toLowerCase().includes(billNumberFilter.toLowerCase()) : true;
      const drawDateMatch = drawDateFilter ? item.draw_date === drawDateFilter : true;
      
      const minAmount = parseFloat(String(minAmountFilter));
      const maxAmount = parseFloat(String(maxAmountFilter));
      const amountMatch = 
        (isNaN(minAmount) || item.total_amount >= minAmount) &&
        (isNaN(maxAmount) || item.total_amount <= maxAmount);

      const minPrize = parseFloat(String(minPrizeFilter));
      const maxPrize = parseFloat(String(maxPrizeFilter));
      const prizeMatch =
        (isNaN(minPrize) || item.total_prize >= minPrize) &&
        (isNaN(maxPrize) || item.total_prize <= maxPrize);

      return billNumberMatch && drawDateMatch && amountMatch && prizeMatch;
    });
  }, [lotteryData, billNumberFilter, drawDateFilter, minAmountFilter, maxAmountFilter, minPrizeFilter, maxPrizeFilter]);

  const clearFilters = () => {
    setBillNumberFilter('');
    setDrawDateFilter('');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    setMinPrizeFilter('');
    setMaxPrizeFilter('');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // รวมยอดซื้อและเงินรางวัล
  const totalAmount = filteredData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalPrize = filteredData.reduce((sum, item) => sum + item.total_prize, 0);

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
                  <BreadcrumbPage>สรุปยอดขาย</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground p-2 md:p-4 transition-colors duration-500">
          <div className="container mx-auto">
            <header className="mb-4 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 dark:from-purple-600 dark:via-pink-400 dark:to-red-400">
                สรุปผลสลากกินแบ่งรัฐบาล
              </h1>
              <p className="text-xs text-muted-foreground mt-1">ดูและกรองประวัติการซื้อสลากและเงินรางวัลของคุณ</p>
            </header>

            {/* Filter Section */}
            <div className="bg-card/80 backdrop-blur-md shadow rounded-md p-3 mb-4 border border-border transition-colors duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                {/* Bill Number Filter */}
                <div>
                  <label htmlFor="billNumber" className="block text-xs font-medium text-muted-foreground mb-0.5">เลขบิล</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      id="billNumber"
                      value={billNumberFilter}
                      onChange={(e) => setBillNumberFilter(e.target.value)}
                      placeholder="เช่น 123456"
                      className="w-full pl-8 pr-2 py-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs text-foreground placeholder:text-xs placeholder-muted-foreground"
                    />
                  </div>
                </div>
                {/* Draw Date Filter */}
                <div>
                  <label htmlFor="drawDate" className="block text-xs font-medium text-muted-foreground mb-0.5">วันที่ออกรางวัล</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="date"
                      id="drawDate"
                      value={drawDateFilter}
                      onChange={(e) => setDrawDateFilter(e.target.value)}
                      className="w-full pl-8 pr-2 py-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs text-foreground"
                    />
                  </div>
                </div>
                {/* Total Amount Filter */}
                <div className="flex flex-col gap-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-0.5">ยอดซื้อ (ต่ำสุด/สูงสุด)</label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      value={minAmountFilter}
                      onChange={(e) => setMinAmountFilter(e.target.value)}
                      placeholder="ต่ำสุด"
                      className="w-1/2 p-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs placeholder:text-xs placeholder-muted-foreground"
                    />
                    <input
                      type="number"
                      value={maxAmountFilter}
                      onChange={(e) => setMaxAmountFilter(e.target.value)}
                      placeholder="สูงสุด"
                      className="w-1/2 p-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs placeholder:text-xs placeholder-muted-foreground"
                    />
                  </div>
                </div>
                {/* Total Prize Filter */}
                <div className="flex flex-col gap-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-0.5">เงินรางวัล (ต่ำสุด/สูงสุด)</label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      value={minPrizeFilter}
                      onChange={(e) => setMinPrizeFilter(e.target.value)}
                      placeholder="ต่ำสุด"
                      className="w-1/2 p-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs placeholder:text-xs placeholder-muted-foreground"
                    />
                    <input
                      type="number"
                      value={maxPrizeFilter}
                      onChange={(e) => setMaxPrizeFilter(e.target.value)}
                      placeholder="สูงสุด"
                      className="w-1/2 p-1 bg-input border border-border rounded focus:ring-primary focus:border-primary text-xs placeholder:text-xs placeholder-muted-foreground"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center px-2 py-1 bg-destructive hover:bg-destructive/80 text-xs text-white rounded shadow transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-opacity-50"
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  ล้างตัวกรอง
                </button>
              </div>
            </div>

            {/* Data Table / Results */}
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-t-primary border-r-primary border-b-muted border-l-muted rounded-full"
                ></motion.div>
              </div>
            )}

            {error && <p className="text-center text-destructive text-lg">{error}</p>}

            {!isLoading && !error && (
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>ประวัติการซื้อสลากและเงินรางวัล</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขบิล</TableHead>
                      <TableHead>วันที่ออกรางวัล</TableHead>
                      <TableHead>ยอดซื้อ</TableHead>
                      <TableHead>ยอดที่ถูกรางวัล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((item) => (
                        <TableRow key={`${item.bill_number},${item.draw_date}`} className={item.total_prize > 0 ? "bg-green-50 dark:bg-green-900/20" : ""}>
                          <TableCell>{item.bill_number}</TableCell>
                          <TableCell>{formatDate(item.draw_date)}</TableCell>
                          <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                          <TableCell className={item.total_prize > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                            {formatCurrency(item.total_prize)}{item.total_prize > 0 && <span className="ml-1">🎉</span>}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          <FilterIcon className="inline h-6 w-6 mr-2 align-middle" />ไม่พบข้อมูล ลองปรับตัวกรองใหม่
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Total Row */}
                    {filteredData.length > 0 && (
                      <TableRow
                        className="bg-yellow-100 dark:bg-yellow-900/40"
                      >
                        <TableCell colSpan={2} className="text-right font-bold">รวมทั้งหมด</TableCell>
                        <TableCell className="font-bold">{formatCurrency(totalAmount)}</TableCell>
                        <TableCell className="font-bold text-green-600">{formatCurrency(totalPrize)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <footer className="text-center mt-12 text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Lottery Insights. All rights reserved.</p>
            </footer>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </DirectionProvider>
);
};

export default LotterySummaryPage;


