import React, { useEffect, useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DollarSign, TicketIcon, Hash, Tag } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/lib/supabase/supabaseClient";
import { fetchTicketPurchase } from "@/lib/lottery-print";

interface BillDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  billNumber?: string;
  ticketId?: string;
}

interface LotteryResult {
  id: string;
  draw_date: string;
  sub_type_id: number;
  number: string;
  // ... other fields
}

const BillDetailDrawer: React.FC<BillDetailDrawerProps> = ({ isOpen, onOpenChange, billNumber, ticketId }) => {
  const [loading, setLoading] = useState(false);
  const [purchase, setPurchase] = useState<any>(null);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลบิลและผลรางวัล
  useEffect(() => {
    if (!isOpen) return;
    if (!billNumber && !ticketId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const purchaseData = await fetchTicketPurchase({ bill_number: billNumber, id: ticketId });
        setPurchase(purchaseData);
        if (purchaseData) {
          // ดึงผลรางวัลตามงวดและชนิดหวย
          const { data: resultData, error: resultError } = await supabase
            .from("lottery_results")
            .select("*")
            .eq("draw_date", purchaseData.draw_date)
            .eq("lottery_sub_type_id", purchaseData.items[0]?.lottery_sub_types?.lottery_sub_type_id || 0);
          if (resultError) throw resultError;
          setResults(resultData || []);
        }
      } catch (e: any) {
        setError(e.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, billNumber, ticketId]);

  // ฟังก์ชันตรวจสอบว่ารายการนี้ถูกรางวัลหรือไม่
  function isWinningItem(item: any): boolean {
    if (!results.length) return false;
    // เปรียบเทียบเลขกับผลรางวัลที่ตรงกับ type_number
    return item.numbers.some((num: string) =>
      results.some(
        (r) =>
          r.number === num &&
          r.sub_type_id === item.lottery_sub_types.lottery_sub_type_id &&
          r.draw_date === purchase?.draw_date
      )
    );
  }

  // สรุปยอดรวม
  const summary = useMemo(() => {
    if (!purchase) return { total: 0, win: 0, lose: 0 };
    let total = 0, win = 0, lose = 0;
    purchase.items.forEach((item: any) => {
      const amt = item.amount * item.numbers.length;
      total += amt;
      if (isWinningItem(item)) win += amt;
      else lose += amt;
    });
    return { total, win, lose };
  }, [purchase, results]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg w-full mx-auto rounded-t-2xl md:rounded-l-2xl md:rounded-t-none md:right-0 md:fixed md:top-0 md:bottom-0 md:w-[420px] p-0 overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>
            <TicketIcon className="inline w-6 h-6 mr-2 text-red-600" />
            รายละเอียดบิล {purchase?.ticket_set_number || billNumber}
          </DrawerTitle>
          <DrawerDescription>
            {purchase?.ticket_set_name && <span className="block">ชื่อบิล: {purchase.ticket_set_name}</span>}
            {purchase?.draw_date && (
              <span className="block">งวด: {format(new Date(purchase.draw_date), "d MMM yy", { locale: th })} ({purchase.draw_time})</span>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4" style={{paddingBottom: 0}}>
          {loading ? (
            <div className="text-center py-8 text-red-600">กำลังโหลด...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : purchase ? (
            <Card className="mb-4 p-2 bg-slate-50 dark:bg-slate-800 border-0 shadow-none">
              <Table className="w-full text-xs md:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableCell>ชนิด</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>หมายเลข</TableCell>
                    <TableCell className="text-right">ราคา</TableCell>
                    <TableCell className="text-center">สถานะ</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item: any) => {
                    const win = isWinningItem(item);
                    return (
                      <TableRow key={item.id} className={win ? "bg-red-50 dark:bg-red-900/20" : ""}>
                        <TableCell>{item.lottery_sub_types?.sub_type_name || "-"}</TableCell>
                        <TableCell>{item.lottery_sub_number?.type_number || "-"}</TableCell>
                        <TableCell>
                          {item.numbers.map((num: string) => (
                            <span key={num} className={win ? "text-red-700 font-bold" : "text-slate-700 dark:text-slate-200"}>
                              {num}
                            </span>
                          )).reduce((prev: any, curr: any) => [prev, ", ", curr])}
                        </TableCell>
                        <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          {win ? (
                            <Badge variant="secondary" className="bg-red-600 text-white">ถูกรางวัล</Badge>
                          ) : (
                            <Badge variant="secondary">ไม่ถูกรางวัล</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="text-center py-8 text-slate-500">ไม่พบข้อมูลบิล</div>
          )}
        </div>
        {/* สรุปยอดรวม: sticky bottom */}
        <div className="sticky bottom-0 left-0 w-full z-10 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-2 justify-between items-center text-sm" style={{boxShadow: '0 -2px 8px 0 rgba(0,0,0,0.03)'}}>
          <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold">
            <DollarSign className="w-4 h-4" /> ยอดซื้อ: {summary.total.toLocaleString()} บาท
          </span>
          <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold">
            <TicketIcon className="w-4 h-4" /> ถูกรางวัล: {summary.win.toLocaleString()} บาท
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
            <Hash className="w-4 h-4" /> ไม่ถูก: {summary.lose.toLocaleString()} บาท
          </span>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">ปิด</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default BillDetailDrawer; 