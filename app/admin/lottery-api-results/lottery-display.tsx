// app/admin/lottery-api-results/lottery-display.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // <-- [ใหม่] Import Badge
import type { LotteryResult } from './page';
import { Clock, CalendarDays, Loader2 } from 'lucide-react';

// === Component ย่อย: History Drawer ===
function HistoryDrawer({ lottery }: { lottery: LotteryResult }) {
  const [history, setHistory] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (isLoading || history.length > 0) return; // ไม่ต้อง fetch ซ้ำถ้ามีข้อมูลแล้ว
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/lottery-history-by-name?name=${encodeURIComponent(lottery.lottery_name)}`);
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
      const data = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet onOpenChange={(open) => { if (open) fetchHistory(); }}>
      <SheetTrigger asChild>
        <div className="border bg-card text-card-foreground rounded-lg p-3 shadow-sm h-full cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
          <h4 className="text-xs font-bold tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center">
            {lottery.lottery_name}
          </h4>
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{lottery.draw_time ? lottery.draw_time.substring(0, 5) : 'N/A'}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {lottery.results.map((prize, index) => (
              <li key={index} className="text-xs flex justify-between">
                <span>{prize.split(':')[0]}</span>
                <span className="font-semibold">{prize.split(':')[1]}</span>
              </li>
            ))}
          </ul>
        </div>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>ผลย้อนหลัง: {lottery.lottery_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {isLoading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">วันที่</TableHead>
                  <TableHead>ผลรางวัล</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium">
                      {new Date(item.draw_date).toLocaleDateString('th-TH', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}
                      <div className="text-muted-foreground">{item.draw_time?.substring(0,5)}</div>
                    </TableCell>
                    {/* --- [จุดที่แก้ไขหลัก] --- */}
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {item.results.map((prize, index) => (
                          <Badge key={index} variant="outline" className="font-normal text-xs">
                            {prize}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {/* ------------------------- */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


// === Component หลักสำหรับแสดงผลแต่ละ Category ===
interface LotteryDisplayProps {
  categoryName: string;
  results: LotteryResult[];
}

export function LotteryDisplay({ categoryName, results }: LotteryDisplayProps) {
  if (!results || results.length === 0) {
    return null;
  }
  
  const latestDrawDate = new Date(results[0].draw_date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
          <span>{categoryName}</span>
          <span className="text-base font-normal text-muted-foreground flex items-center">
            <CalendarDays className="w-4 h-4 mr-2" />
            งวดวันที่ {latestDrawDate.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {results.map((result) => (
            <HistoryDrawer key={result.id} lottery={result} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}