"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { CalendarIcon, XIcon, FilterIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

interface ManageSummaryItem {
  draw_date: string;
  total_amount: number;
  total_prize: number;
  balance: number;
  net_balance?: number;
}

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const fetchManageSummaryData = async (): Promise<ManageSummaryItem[]> => {
  // ดึงข้อมูล ticket และ prize แล้วรวมตาม draw_date
  // 1. ดึง ticket
  const { data: tickets, error: ticketsError } = await supabaseClient
    .from("lottery_tickets")
    .select("draw_date, total_amount");
  if (ticketsError) throw ticketsError;

  // 2. ดึง prize
  const { data: winnings, error: winningsError } = await supabaseClient
    .from("lottery_winning_bills")
    .select("draw_date, total_prize");
  if (winningsError) throw winningsError;

  // 3. รวมยอดตามวันที่
  const dateMap: Record<string, { total_amount: number; total_prize: number }> = {};
  (tickets || []).forEach((t) => {
    if (!dateMap[t.draw_date]) dateMap[t.draw_date] = { total_amount: 0, total_prize: 0 };
    dateMap[t.draw_date].total_amount += t.total_amount || 0;
  });
  (winnings || []).forEach((w) => {
    if (!dateMap[w.draw_date]) dateMap[w.draw_date] = { total_amount: 0, total_prize: 0 };
    dateMap[w.draw_date].total_prize += w.total_prize || 0;
  });

  // 4. สร้าง array สำหรับตาราง
  return Object.entries(dateMap)
    .map(([draw_date, { total_amount, total_prize }]) => {
      const balance = total_amount - total_prize;
      // คำนวณยอดคงเหลือสุทธิ (หัก 8% และ 10%)
      const percent8 = balance * 0.08;
      const percent10 = balance * 0.10;
      const net_balance = balance - percent8 - percent10;
      return {
        draw_date,
        total_amount,
        total_prize,
        balance,
        net_balance,
      };
    })
    .sort((a, b) => b.draw_date.localeCompare(a.draw_date)); // เรียงวันที่ใหม่สุดก่อน
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount: number, showNegativeSign = false) => {
  // ถ้า showNegativeSign เป็น true และ amount < 0 ให้ใส่เครื่องหมายลบ
  const absAmount = Math.abs(amount);
  const formatted = `฿${absAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return showNegativeSign && amount < 0 ? `- ${formatted}` : formatted;
};

const LotteryManageSummaryPage: React.FC = () => {
  const [data, setData] = useState<ManageSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawDateFilter, setDrawDateFilter] = useState("");
  const [percent1, setPercent1] = useState(8);
  const [percent2, setPercent2] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchManageSummaryData()
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((err) => {
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchPercentages = async () => {
      // 1. ดึง user id
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      // 2. ดึง house_id จาก profiles
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("house_id")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.house_id) return;

      // 3. ดึง percent1, percent2 จาก house_percentages
      const { data: house } = await supabaseClient
        .from("house_percentages")
        .select("percent1, percent2")
        .eq("id", profile.house_id)
        .single();

      if (house) {
        setPercent1(Number(house.percent1));
        setPercent2(Number(house.percent2));
      }
    };

    fetchPercentages();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      drawDateFilter ? item.draw_date === drawDateFilter : true
    );
  }, [data, drawDateFilter]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalPrize = filteredData.reduce((sum, item) => sum + item.total_prize, 0);
  const totalBalance = filteredData.reduce((sum, item) => sum + item.balance, 0);
  const totalPercent1 = filteredData.reduce((sum, item) => sum + (item.balance * (percent1 / 100)), 0);
  const totalPercent2 = filteredData.reduce((sum, item) => sum + (item.balance * (percent2 / 100)), 0);
  const totalNetBalance = filteredData.reduce((sum, item) => sum + (item.balance - (item.balance * (percent1 / 100)) - (item.balance * (percent2 / 100))), 0);

  const clearFilters = () => setDrawDateFilter("");

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 dark:from-purple-600 dark:via-pink-400 dark:to-red-400">
        สรุปยอดตามวันที่
      </h1>
      <div className="bg-card/80 backdrop-blur-md shadow rounded-md p-3 mb-4 border border-border">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="flex-1">
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
          <button
            onClick={clearFilters}
            className="flex items-center px-2 py-1 bg-destructive hover:bg-destructive/80 text-xs text-white rounded shadow transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-opacity-50 mt-2 md:mt-6"
          >
            <XIcon className="h-4 w-4 mr-1" />ล้างตัวกรอง
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-16 h-16 border-4 border-t-primary border-r-primary border-b-muted border-l-muted rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <p className="text-center text-destructive text-lg">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>สรุปยอดซื้อและเงินรางวัลตามวันที่</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่ออกรางวัล</TableHead>
                <TableHead>ยอดซื้อรวม</TableHead>
                <TableHead>เงินรางวัลรวม</TableHead>
                <TableHead>ยอดคงเหลือ</TableHead>
                <TableHead>{percent1}%</TableHead>
                <TableHead>{percent2}%</TableHead>
                <TableHead>ยอดคงเหลือสุทธิ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => {
                  const percentValue1 = item.balance * (percent1 / 100);
                  const percentValue2 = item.balance * (percent2 / 100);
                  const net_balance = item.balance - percentValue1 - percentValue2;
                  return (
                    <TableRow key={item.draw_date}>
                      <TableCell>{formatDate(item.draw_date)}</TableCell>
                      <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell className="text-green-600 font-bold">{formatCurrency(item.total_prize)}</TableCell>
                      <TableCell className={item.balance < 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                        {item.balance < 0 ? formatCurrency(item.balance, true) : formatCurrency(item.balance)}
                      </TableCell>
                      <TableCell>{formatCurrency(percentValue1)}</TableCell>
                      <TableCell>{formatCurrency(percentValue2)}</TableCell>
                      <TableCell className={net_balance < 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                        {net_balance < 0 ? formatCurrency(net_balance, true) : formatCurrency(net_balance)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    <FilterIcon className="inline h-6 w-6 mr-2 align-middle" />ไม่พบข้อมูล ลองปรับตัวกรองใหม่
                  </TableCell>
                </TableRow>
              )}
              {/* Total Row */}
              {filteredData.length > 0 && (
                <TableRow className="bg-yellow-100 dark:bg-yellow-900/40">
                  <TableCell className="text-right font-bold" colSpan={1}>รวมทั้งหมด</TableCell>
                  <TableCell className="font-bold">{formatCurrency(totalAmount)}</TableCell>
                  <TableCell className="font-bold text-green-600">{formatCurrency(totalPrize)}</TableCell>
                  <TableCell className={totalBalance < 0 ? "font-bold text-red-500" : "font-bold text-green-600"}>
                    {totalBalance < 0 ? formatCurrency(totalBalance, true) : formatCurrency(totalBalance)}
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(totalPercent1)}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(totalPercent2)}</TableCell>
                  <TableCell className={totalNetBalance < 0 ? "font-bold text-red-500" : "font-bold text-green-600"}>
                    {totalNetBalance < 0 ? formatCurrency(totalNetBalance, true) : formatCurrency(totalNetBalance)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default LotteryManageSummaryPage; 