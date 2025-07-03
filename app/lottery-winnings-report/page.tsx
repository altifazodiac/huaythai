"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CalendarIcon, SearchIcon } from "lucide-react"; // Need to install lucide-react
import { Badge } from "@/components/ui/badge"; // Need to install from shadcn/ui
import { Skeleton } from "@/components/ui/skeleton"; // Need to install from shadcn/ui
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRequireAuth } from "@/hooks/use-require-auth";

// 📌 Interfaces
interface WinningTicket {
  lottery_date: string;
  ticket_set_number: string;
  amount: number;
  total_winnings: number;
  profiles: {
    name: string;
  } | null; // Make it nullable since Supabase might return null
}

interface AggregatedWinnings {
  lottery_date: string;
  profileName: string;
  ticket_set_count: number;
  sum_amount: number;
  sum_total_winnings: number;
}

export default function LotteryWinningsReportPage() {
  useRequireAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [aggregatedData, setAggregatedData] = useState<Record<string, { name: string; sum_amount: number; sum_total: number; remain: number }[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // ดึงข้อมูล ticket_purchase_items และ winning_ticket_details (ไม่ join profiles)
      const { data: purchaseItems, error: purchaseItemsError } = await supabase
        .from("ticket_purchase_items")
        .select(`
          id,
          amount,
          created_at,
          ticket_purchase_id
        `);

      const { data: purchases, error: purchasesError } = await supabase
        .from("ticket_purchases")
        .select(`
          id,
          user_id,
          purchase_date
        `);

      const { data: winnings, error: winningsError } = await supabase
        .from("winning_tickets")
        .select(`
          id,
          lottery_date,
          user_id
        `);

      const { data: winningDetails, error: winningDetailsError } = await supabase
        .from("winning_ticket_details")
        .select(`
          id,
          winning_ticket_id,
          total
        `);

      // รวม user_id ทั้งหมดที่เกี่ยวข้อง
      const userIds = new Set<string>();
      (purchases || []).forEach((purchase) => userIds.add(purchase.user_id));
      (winnings || []).forEach((win) => userIds.add(win.user_id));

      // ดึง profiles แยก
      let profilesMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", Array.from(userIds));
        if (!profilesError && profiles) {
          profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.name || "ไม่พบชื่อ"]));
        }
      }

      // สร้าง map purchaseId → { user_id, purchase_date }
      const purchaseIdMap: Record<string, { user_id: string; purchase_date: string }> = {};
      (purchases || []).forEach((purchase) => {
        purchaseIdMap[purchase.id] = { user_id: purchase.user_id, purchase_date: purchase.purchase_date };
      });

      // สร้าง map winningTicketId → { user_id, lottery_date }
      const winningTicketIdMap: Record<string, { user_id: string; lottery_date: string }> = {};
      (winnings || []).forEach((win) => {
        winningTicketIdMap[win.id] = { user_id: win.user_id, lottery_date: win.lottery_date };
      });

      // รวมข้อมูลรายวัน
      const dailyMap: Record<string, { name: string; sum_amount: number; sum_total: number }> = {};
      // รวมยอดซื้อ (amount) ต่อวัน
      (purchaseItems || []).forEach((item) => {
        const purchase = purchaseIdMap[item.ticket_purchase_id];
        if (!purchase) return;
        const date = new Date(purchase.purchase_date).toISOString().split('T')[0];
        const userId = purchase.user_id;
        const name = profilesMap[userId] || "ไม่พบชื่อ";
        const key = `${date}_${userId}`;
        if (!dailyMap[key]) dailyMap[key] = { name, sum_amount: 0, sum_total: 0 };
        dailyMap[key].sum_amount += Number(item.amount);
      });
      // รวมยอดถูกรางวัล (total) ต่อวัน
      (winningDetails || []).forEach((detail) => {
        const win = winningTicketIdMap[detail.winning_ticket_id];
        if (!win) return;
        const date = new Date(win.lottery_date).toISOString().split('T')[0];
        const userId = win.user_id;
        const name = profilesMap[userId] || "ไม่พบชื่อ";
        const key = `${date}_${userId}`;
        if (!dailyMap[key]) dailyMap[key] = { name, sum_amount: 0, sum_total: 0 };
        dailyMap[key].sum_total += Number(detail.total);
      });

      // สร้างข้อมูลสำหรับแสดงผล
      const groupedData: Record<string, { name: string; sum_amount: number; sum_total: number; remain: number }[]> = {};
      Object.entries(dailyMap).forEach(([key, value]) => {
        const [date, userId] = key.split('_');
        if (!groupedData[date]) groupedData[date] = [];
        groupedData[date].push({
          name: value.name,
          sum_amount: value.sum_amount,
          sum_total: value.sum_total,
          remain: value.sum_amount - value.sum_total,
        });
      });

      console.log("purchaseItems", purchaseItems?.length, purchaseItems?.slice(0, 5));
      console.log("purchases", purchases?.length, purchases?.slice(0, 5));
      console.log("purchaseIdMap keys", Object.keys(purchaseIdMap).slice(0, 5));
      console.log("ตัวอย่าง ticket_purchase_id ใน purchaseItems", purchaseItems?.map(i => i.ticket_purchase_id).slice(0, 5));

      setAggregatedData(groupedData);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">รายงานสรุปผลถูกรางวัลล็อตเตอรี่</CardTitle>
              <CardDescription className="mt-2">แสดงข้อมูลยอดซื้อ, ยอดถูกรางวัล, และคงเหลือรายวันของผู้ใช้งานทั้งหมด</CardDescription>
            </div>
            <div className="relative w-72">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="searchDate"
                type="text"
                placeholder="ค้นหาตามวันที่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(aggregatedData)
            .filter(([date]) => date.includes(searchTerm))
            .map(([date, records]) => (
              <Card key={date} className="overflow-hidden border border-gray-100">
                <div className="bg-gray-50 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">{date}</h2>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1">
                    {records.length} รายการ
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>ชื่อผู้ใช้งาน</TableHead>
                      <TableHead className="text-right">ยอดซื้อ (sum amount)</TableHead>
                      <TableHead className="text-right">ยอดถูกรางวัล (sum total)</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((item, index) => (
                      <TableRow key={`${date}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.sum_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">{item.sum_total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600">{item.remain.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell>ผลรวมทั้งหมด</TableCell>
                      <TableCell className="text-right">{records.reduce((acc, cur) => acc + cur.sum_amount, 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{records.reduce((acc, cur) => acc + cur.sum_total, 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-blue-600">{records.reduce((acc, cur) => acc + cur.remain, 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            ))}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && Object.keys(aggregatedData).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">ไม่พบข้อมูลรายการถูกรางวัล</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
