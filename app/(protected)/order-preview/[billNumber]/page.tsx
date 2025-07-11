"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, Download, User, Calendar, Clock, Star, Receipt, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { fetchTicketPurchase, getCountdownTextForPrint } from '@/lib/lottery-print';
import html2canvas from 'html2canvas';
import Image from 'next/image';

// Types จาก lottery-print.tsx
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  multiplication_factor: number;
}

interface LotterySubNumber {
  id: number;
  lottery_sub_type_id: number;
  digit_number: number;
  type_number: string;
  price_paid: number;
}

interface PrintLotteryTicketItem {
  id: string;
  numbers: string[];
  amount: number;
  lottery_sub_types: LotterySubType;
  lottery_sub_number: LotterySubNumber;
}

interface ConsolidatedTicketPurchase {
  id: string;
  ticket_set_name: string | null;
  ticket_set_number: string;
  purchase_date: string;
  draw_date: string;
  draw_time: string;
  close_time?: string | null;
  deleted_at?: string | null;
  items: PrintLotteryTicketItem[];
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

// ฟังก์ชัน createGroups จาก lottery-print.tsx
const createGroups = (ticketItems: TicketDisplayItem[], preferredOrderMap: Record<number, string[]> = {}) => {
  const allTypeLabels: Record<number, string[]> = {};

  ticketItems.forEach(item => {
    const label = item.payout.type_number || "-";
    if (!allTypeLabels[item.payout.digit_number]) allTypeLabels[item.payout.digit_number] = [];
    if (!allTypeLabels[item.payout.digit_number].includes(label)) {
      allTypeLabels[item.payout.digit_number].push(label);
    }
  });

  Object.keys(allTypeLabels).forEach(digitStr => {
    const digit = Number(digitStr);
    const labels = allTypeLabels[digit];
    let ordered: string[] = [...labels];
    let fallback: string[] = [];
    if (digit === 2) fallback = ["บน", "ล่าง"];
    else if (digit === 3 || digit === 4) fallback = ["บน", "โต๊ด"];
    else if (digit === 1) fallback = ["วิ่งบน", "วิ่งล่าง"];
    
    if (preferredOrderMap[digit] && preferredOrderMap[digit].length >= fallback.length) {
      ordered = preferredOrderMap[digit].filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    } else if (fallback.length > 0) {
      ordered = fallback.filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    }
    allTypeLabels[digit] = ordered;

    if (digit === 2) {
      allTypeLabels[digit] = ["บน", "ล่าง"];
    }
    if (digit === 3) {
      allTypeLabels[digit] = ["บน", "โต๊ด"];
    }
    if (digit === 4) {
      allTypeLabels[digit] = ["บน", "โต๊ด"];
    }
    if (digit === 1) {
      allTypeLabels[digit] = ["วิ่งบน", "วิ่งล่าง"];
    }
  });

  const groups: Map<GroupKey, Grouped> = new Map();
  const numberMap: Record<string, { digit: number, number: string, amounts: Record<string, number> }> = {};

  ticketItems.forEach(item => {
    const digit = item.payout.digit_number;
    const label = item.payout.type_number;
    item.numbers.forEach(num => {
      const key = `${digit}|${num}`;
      if (!numberMap[key]) {
        numberMap[key] = { digit, number: num, amounts: {} };
      }
      numberMap[key].amounts[label] = item.amount;
    });
  });

  Object.values(numberMap).forEach(({ digit, number, amounts }) => {
    const typeOrder = allTypeLabels[digit];
    const amountsSignature = typeOrder.map(label => amounts[label] !== undefined ? amounts[label] : 0).join('|');
    const key = `${digit}|${typeOrder.join(",")}|${amountsSignature}`;

    if (!groups.has(key)) {
      groups.set(key, {
        digit_number: digit,
        numbers: [],
        typeLabels: typeOrder,
        amounts: Object.fromEntries(typeOrder.map((lab, idx) => [lab, amounts[lab] !== undefined ? amounts[lab] : 0])),
        typeOrder: typeOrder,
      });
    }
    const group = groups.get(key)!;
    if (!group.numbers.includes(number)) group.numbers.push(number);
  });

  return groups;
};

// ฟังก์ชัน getCountdownText จาก lottery-print.tsx
function getCountdownText(drawDateStr: string | undefined, closeTimeStr: string | undefined): string {
  if (!closeTimeStr || !drawDateStr) return "N/A";

  const now = new Date();
  const [h, m, s] = closeTimeStr.split(":").map(Number);
  const closeDate = parseISO(drawDateStr);
  closeDate.setHours(h, m, s || 0, 0);

  const diff = closeDate.getTime() - now.getTime();

  if (diff <= 0) return "หมดเวลา";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours > 0 ? hours + ' ชม. ' : ''}${minutes} นาที ${seconds} วินาที`.trim();
}

// เพิ่มฟังก์ชันช่วยแปลงตัวเลข
function normalizeNum(num: any) {
  if (Array.isArray(num)) return num.join('');
  if (typeof num === 'string' && num.startsWith('["') && num.endsWith('"]')) {
    try {
      const arr = JSON.parse(num);
      if (Array.isArray(arr)) return arr.join('');
    } catch {}
  }
  return num;
}

export default function OrderPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useAuth();
  const [purchase, setPurchase] = useState<ConsolidatedTicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  const billNumber = params.billNumber as string;

  useEffect(() => {
    const loadPurchase = async () => {
      if (!billNumber || !supabase) return;
      
      setLoading(true);
      try {
        const purchaseData = await fetchTicketPurchase({ 
          bill_number: billNumber, 
          supabase 
        });
        setPurchase(purchaseData);
      } catch (error) {
        console.error('Error loading purchase:', error);
        toast.error('ไม่สามารถโหลดข้อมูลบิลได้');
      } finally {
        setLoading(false);
      }
    };

    loadPurchase();
  }, [billNumber, supabase]);

  useEffect(() => {
    if (!purchase) return;

    const updateCountdown = () => {
      const countdownText = getCountdownText(
        purchase.draw_date || undefined,
        purchase.close_time || undefined
      );
      setCountdown(countdownText);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [purchase]);

  const handleScreenshot = async () => {
    if (!printRef.current) return;

    try {
      // สร้าง temporary style element เพื่อ override oklch colors
      const tempStyle = document.createElement('style');
      tempStyle.textContent = `
        *, *::before, *::after {
          color: #333 !important;
          background-color: transparent !important;
          border-color: #e5e5e5 !important;
        }
        [style*="oklch"] {
          color: #333 !important;
          background-color: #fff !important;
        }
        .bg-red-600, .bg-red-800, [class*="bg-red"] {
          background-color: #dc2626 !important;
          color: #fff !important;
        }
        .text-red-600, .text-red-800, [class*="text-red"] {
          color: #dc2626 !important;
        }
        .border-red-200, .border-red-400, [class*="border-red"] {
          border-color: #fecaca !important;
        }
        .bg-red-50 {
          background-color: #fef2f2 !important;
        }
      `;
      document.head.appendChild(tempStyle);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element: Element) => {
          // ข้าม elements ที่อาจมี oklch styles
          const elementClasses = element.className || '';
          const computedStyle = window.getComputedStyle(element);
          
          // ตรวจสอบถ้ามี oklch ใน computed styles
          try {
            const bgColor = computedStyle.backgroundColor;
            const textColor = computedStyle.color;
            const borderColor = computedStyle.borderColor;
            
            if (bgColor?.includes('oklch') || textColor?.includes('oklch') || borderColor?.includes('oklch')) {
              return true;
            }
          } catch (e) {
            // ถ้า error ใน style parsing ให้ข้าม element นี้
            return true;
          }
          
          return false;
        },
                 onclone: (clonedDoc: Document) => {
          // เพิ่ม fallback styles ใน cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              color: #333 !important;
              background-color: inherit !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      } as any);

      // ลบ temporary style
      document.head.removeChild(tempStyle);

      const link = document.createElement('a');
      link.download = `บิล-${billNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('บันทึกภาพสำเร็จ');
    } catch (error) {
      console.error('Error taking screenshot:', error);
      
      // ถ้า error เกี่ยวกับ oklch ให้ลองอีกครั้งด้วย fallback method
      if (error instanceof Error && error.message.includes('oklch')) {
        try {
          toast.info('กำลังลองใหม่ด้วยวิธีอื่น...');
          
          // Fallback: ใช้ html2canvas แบบง่าย ๆ
          const canvas = await html2canvas(printRef.current, {
            scale: 1,
            backgroundColor: '#ffffff',
            logging: false,
            ignoreElements: () => false // ไม่ข้าม element ใด ๆ
          } as any);

          const link = document.createElement('a');
          link.download = `บิล-${billNumber}-fallback.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          toast.success('บันทึกภาพสำเร็จ (โหมดสำรอง)');
        } catch (fallbackError) {
          console.error('Fallback screenshot failed:', fallbackError);
          toast.error('เกิดข้อผิดพลาดในการบันทึกภาพ กรุณาลองใหม่อีกครั้ง');
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกภาพ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลดข้อมูลบิล...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">ไม่พบข้อมูลบิล</h2>
          <p className="text-muted-foreground mb-4">บิลหมายเลข {billNumber} ไม่พบในระบบ</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
        </div>
      </div>
    );
  }

  // Transform และสร้าง groups
  const displayItems: TicketDisplayItem[] = purchase.items.map(item => ({
    subType: item.lottery_sub_types,
    payout: item.lottery_sub_number,
    numbers: item.numbers,
    amount: item.amount,
  }));

  const groups = createGroups(displayItems);

  // คำนวณยอดรวม
  const billTotal = Array.from(groups.values()).reduce((sum, group) => {
    return sum + group.typeOrder.reduce((s, label) => s + (group.amounts[label] ?? 0) * group.numbers.length, 0);
  }, 0);

  // Format วันที่
  const formattedActualDrawDate = purchase.draw_date 
    ? format(parseISO(purchase.draw_date), "d MMMM yyyy", { locale: th })
    : "ไม่ระบุ";

  const THAILAND_TZ = "Asia/Bangkok";
  const purchaseDateObj = parseISO(purchase.purchase_date);
  const purchaseDateInThai = toZonedTime(purchaseDateObj, THAILAND_TZ);
  const formattedPurchaseDateTime = format(purchaseDateInThai, "d MMM yy HH:mm น.", { locale: th });

  const lotteryTypeName = purchase.items.length > 0 ? purchase.items[0].lottery_sub_types.sub_type_name : "ไม่ระบุประเภท";

  return (
    <div className="min-h-screen bg-white text-[#222]" style={{ background: '#fff', color: '#222' }}>
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-red-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              <h1 className="text-xl font-bold">สรุปรายการซื้อหวย</h1>
            </div>
          </div>
          <Button
            onClick={handleScreenshot}
            variant="secondary"
            size="sm"
            className="bg-white text-red-600 hover:bg-gray-100"
          >
            <Camera className="h-4 w-4 mr-2" />
            แคปเจอร์หน้าจอ
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div ref={printRef} className="bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden" style={{ background: '#fff', color: '#222' }}>
          {/* Header Card */}
          <div className="bg-gradient-to-r from-red-800 to-red-600 text-white p-6" style={{ background: 'linear-gradient(90deg,#991b1b 0%,#ef4444 100%)', color: '#fff' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className=" rounded-full">
                <Image
              src="https://bqgiwmawqnixpgvuqhuc.supabase.co/storage/v1/object/public/images//Logo2.png"
              alt="logo"
              width={80}
              height={80}
              className={`
                rounded-full 
               animate-fade-in-up 
             
                 
              `}
               
            />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{lotteryTypeName}</h2>
                  <p className="text-red-100">บิลหมายเลข: {purchase.ticket_set_number}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-red-100">
                  <User className="h-4 w-4" />
                  <span>{user?.user_metadata?.name || "Guest"}</span>
                </div>
                <div className="flex items-center gap-2 text-red-100 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>งวด: {formattedActualDrawDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-6 bg-red-50 border-b border-red-200" style={{ background: '#fef2f2', color: '#991b1b' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">เวลาออกรางวัล</div>
                <div className="font-semibold">{purchase.draw_time || 'N/A'}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">ปิดรับใน</div>
                <div className="font-semibold text-red-600">
                  <Clock className="inline h-4 w-4 mr-1" />
                  {countdown}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">วันที่ซื้อ</div>
                <div className="font-semibold">{formattedPurchaseDateTime}</div>
              </div>
            </div>
            
            {purchase.ticket_set_name && (
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground">ชื่อผู้ซื้อ</div>
                <div className="font-semibold">{purchase.ticket_set_name}</div>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-800">รายการหวยที่ซื้อ</h3>
            <div className="space-y-4">
              {Array.from(groups.values()).map((group, index) => (
                <div
                  key={index}
                  className="flex border-b border-red-200 rounded-lg shadow-sm bg-white"
                  style={{ background: '#fff', color: '#991b1b', alignItems: 'stretch' }}
                >
                  {/* Group Info */}
                  <div
                    className="flex flex-col items-center justify-center px-4 py-2 border-r-2 border-dashed border-red-400"
                    style={{ minWidth: 110, background: '#fef2f2', borderRadius: '8px 0 0 8px' }}
                  >
                    <div className="font-bold text-lg mb-1 flex items-center gap-1">
                      <span>{group.digit_number} ตัว</span>
                    </div>
                    <div className="text-xs font-medium mb-1">
                      {group.typeOrder.map(label => (
                        <span key={label} className="inline-flex items-center mr-1">
                          <span className="text-yellow-500">★</span> {label}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs mb-1">
                      {group.typeOrder.map(label => (group.amounts[label] ?? 0).toLocaleString()).join(' x ')}
                    </div>
                    <div className="text-xs font-bold text-red-600">
                      รวม: {(group.typeOrder.reduce((sum, label) => sum + (group.amounts[label] ?? 0), 0) * group.numbers.length).toLocaleString()}฿
                    </div>
                  </div>
                  {/* Numbers */}
                  <div className="flex-1 flex flex-col justify-center px-4 py-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {group.numbers.map((num, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1 rounded-full text-base font-bold"
                          style={{
                            background: 'linear-gradient(90deg,#ef4444 0%,#991b1b 100%)',
                            color: '#fff',
                            boxShadow: '0 1px 2px rgba(220,38,38,0.10)'
                          }}
                        >
                          {normalizeNum(num)}
                        </span>
                      ))}
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Section */}
          <div className="bg-red-600 text-white p-6" style={{ background: 'linear-gradient(90deg,#991b1b 0%,#ef4444 100%)', color: '#fff' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Receipt className="h-5 w-5" />
                </div>
                <span className="text-lg font-medium">ยอดรวมทั้งหมด</span>
              </div>
              <div className="text-2xl font-bold">
                {billTotal.toLocaleString()} บาท
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 text-center text-sm text-muted-foreground" style={{ background: '#f9fafb', color: '#991b1b' }}>
            <p>สิงโตทองคำ 77 ออนไลน์ © {new Date().getFullYear()} | ขอบคุณที่อุดหนุน</p>
          </div>
        </div>
      </div>
    </div>
  );
} 