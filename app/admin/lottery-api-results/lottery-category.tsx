// app/admin/lottery-api-results/lottery-category.tsx
"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { LotteryResult } from './page';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface LotteryCategoryProps {
  categoryName: string;
  countryCode: string;
  latestResults: LotteryResult[];
}

function ResultCard({ result }: { result: LotteryResult }) {
  return (
    <div className="border bg-card text-card-foreground rounded-lg p-3 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h4 className="text-xs font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          {result.lottery_name}
        </h4>
        <p className="text-[10px] text-muted-foreground">
          {new Date(result.draw_date).toLocaleDateString('th-TH', { timeZone: 'UTC', day: '2-digit', month: 'short', year: '2-digit' })}
          {result.draw_time && ` - ${result.draw_time.substring(0, 5)}`}
        </p>
      </div>
      <ul className="mt-2 space-y-1">
        {result.results.map((prize, index) => (
          <li key={index} className="text-xs flex justify-between">
            <span>{prize.split(':')[0]}</span>
            <span className="font-semibold">{prize.split(':')[1]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LotteryCategory({ categoryName, countryCode, latestResults }: LotteryCategoryProps) {
  const [history, setHistory] = useState<LotteryResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTriggerClick = () => {
    // ดึงข้อมูลเฉพาะเมื่อยังไม่มีข้อมูลและไม่ได้กำลังโหลดอยู่
    if (!history && !isLoading) {
      fetchHistory();
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/lottery-history?country=${countryCode}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลย้อนหลังได้');
      }
      const data: LotteryResult[] = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">{categoryName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {latestResults.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="history">
            {/* --- [จุดที่แก้ไข] --- */}
            {/* 1. ลบ asChild และ <Button> ออก
              2. ใส่ onClick และ style ที่ต้องการลงใน AccordionTrigger โดยตรง
              3. ใช้ Fragment (<>) ครอบ Loader และ Text เพื่อให้เป็นลูกตัวเดียวในเงื่อนไข
            */}
            <AccordionTrigger onClick={handleTriggerClick} className="w-full justify-center text-sm font-medium text-primary hover:no-underline hover:bg-accent rounded-md py-2">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังโหลด...
                </>
              ) : (
                'ดูผลย้อนหลัง'
              )}
            </AccordionTrigger>
            {/* ------------------- */}
            <AccordionContent>
              {error && <p className="text-red-500 text-center">{error}</p>}
              {history && (
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ชื่อหวย</TableHead>
                        <TableHead className="text-right">ผลรางวัล</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">
                             {new Date(item.draw_date).toLocaleDateString('th-TH', { timeZone: 'UTC', day: '2-digit', month: 'short', year: '2-digit' })}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{item.lottery_name}</TableCell>
                          <TableCell className="text-right text-xs">{item.results.join(', ')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardFooter>
    </Card>
  );
}