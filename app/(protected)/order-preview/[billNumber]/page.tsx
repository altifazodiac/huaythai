"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, User, Calendar, Clock, Star, Receipt, Camera, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { fetchTicketPurchase } from '@/lib/lottery-print';
import html2canvas from 'html2canvas';
import Image from 'next/image';

// Types
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  payout_rate: number;
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

// ฟังก์ชัน createGroups
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

    if (digit === 2) allTypeLabels[digit] = ["บน", "ล่าง"];
    if (digit === 3) allTypeLabels[digit] = ["บน", "โต๊ด"];
    if (digit === 4) allTypeLabels[digit] = ["บน", "โต๊ด"];
    if (digit === 1) allTypeLabels[digit] = ["วิ่งบน", "วิ่งล่าง"];
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
        amounts: Object.fromEntries(typeOrder.map((lab) => [lab, amounts[lab] !== undefined ? amounts[lab] : 0])),
        typeOrder: typeOrder,
      });
    }
    const group = groups.get(key)!;
    if (!group.numbers.includes(number)) group.numbers.push(number);
  });

  return groups;
};

// ฟังก์ชัน getCountdownText
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

// แปลงตัวเลข
function normalizeNum(num: any): string {
  if (Array.isArray(num)) return num.join('');
  if (typeof num === 'string' && num.startsWith('["') && num.endsWith('"]')) {
    try {
      const arr = JSON.parse(num);
      if (Array.isArray(arr)) return arr.join('');
    } catch {}
  }
  return String(num);
}

// Function สร้าง HTML สำหรับพิมพ์ใบโพยหวย
interface PrintHTMLParams {
  billNumber: string;
  lotteryTypeName: string;
  userName: string;
  drawDate: string;
  purchaseDate: string;
  drawTime: string;
  closeTime: string;
  groups: Grouped[];
  billTotal: number;
  billName: string | null;
}

function generatePrintHTML(params: PrintHTMLParams): string {
  const { billNumber, lotteryTypeName, userName, drawDate, purchaseDate, drawTime, closeTime, groups, billTotal, billName } = params;

  const groupsHTML = groups.map(group => {
    const numbersHTML = group.numbers.map(num => 
      `<span class="number">${normalizeNum(num)}</span>`
    ).join('');

    const typeLabels = group.typeOrder.map(label => `★${label}`).join(' ');
    const amounts = group.typeOrder.map(label => (group.amounts[label] ?? 0).toLocaleString()).join(' x ');
    const groupTotal = group.typeOrder.reduce((sum, label) => sum + (group.amounts[label] ?? 0), 0) * group.numbers.length;

    return `
      <div class="group-section">
        <div class="group-header">
          <div class="group-title">${group.digit_number} ตัว</div>
          <div class="group-info">${typeLabels}</div>
          <div class="group-amounts">${amounts}</div>
          <div class="group-total">รวม: ${groupTotal.toLocaleString()}฿</div>
        </div>
        <div class="numbers-grid">${numbersHTML}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบโพยหวย - ${billNumber}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Kanit', sans-serif; font-size: 11px; line-height: 1.4; color: #333; background: #fff; }
    .print-container { max-width: 210mm; margin: 0 auto; padding: 5mm; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #dc2626; margin-bottom: 10px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 50px; height: 50px; border-radius: 50%; }
    .header-title { font-size: 18px; font-weight: 700; color: #dc2626; }
    .header-subtitle { font-size: 11px; color: #666; }
    .header-right { text-align: right; font-size: 10px; color: #666; }
    .header-right strong { color: #333; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; margin-bottom: 10px; }
    .info-item { text-align: center; }
    .info-label { font-size: 9px; color: #666; margin-bottom: 2px; }
    .info-value { font-size: 11px; font-weight: 600; color: #333; }
    .info-value.highlight { color: #dc2626; }
    .group-section { margin-bottom: 12px; border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden; }
    .group-header { display: flex; align-items: center; gap: 12px; padding: 6px 10px; background: #f5f5f5; border-bottom: 1px dashed #ccc; }
    .group-title { font-size: 13px; font-weight: 700; color: #dc2626; min-width: 50px; }
    .group-info { font-size: 10px; color: #666; }
    .group-amounts { font-size: 10px; color: #666; }
    .group-total { font-size: 11px; font-weight: 700; color: #dc2626; margin-left: auto; }
    .numbers-grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
    .number { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; padding: 3px 8px; background: #dc2626; color: #fff; font-weight: 700; font-size: 11px; border-radius: 12px; }
    .total-section { display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: #dc2626; color: #fff; border-radius: 4px; margin-top: 10px; }
    .total-label { font-size: 14px; font-weight: 500; }
    .total-value { font-size: 20px; font-weight: 700; }
    .footer { text-align: center; padding: 8px; font-size: 9px; color: #999; border-top: 1px solid #e5e5e5; margin-top: 10px; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .number { background: #dc2626 !important; color: #fff !important; } .total-section { background: #dc2626 !important; color: #fff !important; } }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="header">
      <div class="header-left">
        <img src="https://wbvgdqiozztgqodtajui.supabase.co/storage/v1/object/public/images//Logo2.png" alt="Logo" class="logo">
        <div>
          <div class="header-title">${lotteryTypeName}</div>
          <div class="header-subtitle">บิลหมายเลข: ${billNumber}</div>
          ${billName ? `<div class="header-subtitle">ชื่อโพย: ${billName}</div>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div><strong>ผู้ซื้อ:</strong> ${userName}</div>
        <div><strong>งวด:</strong> ${drawDate}</div>
        <div><strong>วันที่ซื้อ:</strong> ${purchaseDate}</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">เวลาออกรางวัล</div><div class="info-value">${drawTime}</div></div>
      <div class="info-item"><div class="info-label">เวลาปิดรับ</div><div class="info-value highlight">${closeTime}</div></div>
      <div class="info-item"><div class="info-label">จำนวนรายการ</div><div class="info-value">${groups.reduce((sum, g) => sum + g.numbers.length, 0)} เลข</div></div>
      <div class="info-item"><div class="info-label">ประเภท</div><div class="info-value">${groups.length} กลุ่ม</div></div>
    </div>
    ${groupsHTML}
    <div class="total-section">
      <div class="total-label">💰 ยอดรวมทั้งหมด</div>
      <div class="total-value">${billTotal.toLocaleString()} บาท</div>
    </div>
    <div class="footer">สิงโตทองคำ 77 ออนไลน์ © ${new Date().getFullYear()} | ขอบคุณที่อุดหนุน | พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</div>
  </div>
</body>
</html>`;
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

  // Screenshot function
  const handleScreenshot = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `บิล-${billNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('บันทึกภาพสำเร็จ');
    } catch (error) {
      console.error('Error taking screenshot:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกภาพ');
    }
  };

  // Print function - ใบโพยหวยแบบมืออาชีพ
  const handlePrint = () => {
    if (!purchase) return;

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
    const userName = user?.user_metadata?.name || "Guest";

    // สร้าง HTML สำหรับพิมพ์
    const printContent = generatePrintHTML({
      billNumber: purchase.ticket_set_number,
      lotteryTypeName,
      userName,
      drawDate: formattedActualDrawDate,
      purchaseDate: formattedPurchaseDateTime,
      drawTime: purchase.draw_time || 'N/A',
      closeTime: purchase.close_time || 'N/A',
      groups: Array.from(groups.values()),
      billTotal,
      billName: purchase.ticket_set_name,
    });

    // เปิดหน้าต่างพิมพ์
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #dc2626', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#666' }}>กำลังโหลดข้อมูลบิล...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Receipt style={{ width: 64, height: 64, color: '#999', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#333' }}>ไม่พบข้อมูลบิล</h2>
          <p style={{ color: '#666', marginBottom: 16 }}>บิลหมายเลข {billNumber} ไม่พบในระบบ</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
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
    <div style={{ minHeight: '100vh', background: '#fff', color: '#222' }}>
      {/* Header */}
      <div style={{ background: '#dc2626', color: '#fff', padding: 16 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              style={{ color: '#fff', background: 'transparent' }}
            >
              <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
              กลับ
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt style={{ width: 24, height: 24 }} />
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>สรุปรายการซื้อหวย</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={handleScreenshot}
              size="sm"
              style={{ background: '#fff', color: '#dc2626', border: 'none' }}
            >
              <Camera style={{ width: 16, height: 16, marginRight: 8 }} />
              แคปเจอร์หน้าจอ
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              style={{ background: '#166534', color: '#fff', border: 'none' }}
            >
              <Printer style={{ width: 16, height: 16, marginRight: 8 }} />
              พิมพ์ใบโพย
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <div ref={printRef} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #fecaca', overflow: 'hidden' }}>
          {/* Header Card */}
          <div style={{ background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)', color: '#fff', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Image
                  src="https://wbvgdqiozztgqodtajui.supabase.co/storage/v1/object/public/images//Logo2.png"
                  alt="logo"
                  width={80}
                  height={80}
                  style={{ borderRadius: '50%' }}
                />
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{lotteryTypeName}</h2>
                  <p style={{ color: '#fecaca', margin: '4px 0 0' }}>บิลหมายเลข: {purchase.ticket_set_number}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fecaca', justifyContent: 'flex-end' }}>
                  <User style={{ width: 16, height: 16 }} />
                  <span>{user?.user_metadata?.name || "Guest"}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fecaca', marginTop: 4, justifyContent: 'flex-end' }}>
                  <Calendar style={{ width: 16, height: 16 }} />
                  <span>งวด: {formattedActualDrawDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div style={{ padding: 24, background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666' }}>เวลาออกรางวัล</div>
                <div style={{ fontWeight: 600, color: '#333' }}>{purchase.draw_time || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666' }}>ปิดรับใน</div>
                <div style={{ fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {countdown}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>เวลาปิดรับ: {purchase.close_time || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666' }}>วันที่ซื้อ</div>
                <div style={{ fontWeight: 600, color: '#333' }}>{formattedPurchaseDateTime}</div>
              </div>
            </div>
            {purchase.ticket_set_name && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666' }}>ชื่อบิล/โพย</div>
                <div style={{ fontWeight: 600, color: '#333' }}>{purchase.ticket_set_name}</div>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#991b1b' }}>รายการหวยที่ซื้อ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from(groups.values()).map((group, index) => (
                <div
                  key={index}
                  style={{ display: 'flex', border: '1px solid #fecaca', borderRadius: 8, overflow: 'hidden', background: '#fff' }}
                >
                  {/* Group Info */}
                  <div style={{ minWidth: 120, padding: 12, background: '#fef2f2', borderRight: '2px dashed #f87171', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#991b1b', marginBottom: 4 }}>
                      {group.digit_number} ตัว
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                      {group.typeOrder.map(label => (
                        <span key={label} style={{ marginRight: 4 }}>
                          <Star style={{ width: 10, height: 10, color: '#f59e0b', display: 'inline' }} /> {label}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                      {group.typeOrder.map(label => (group.amounts[label] ?? 0).toLocaleString()).join(' x ')}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                      รวม: {(group.typeOrder.reduce((sum, label) => sum + (group.amounts[label] ?? 0), 0) * group.numbers.length).toLocaleString()}฿
                    </div>
                  </div>
                  {/* Numbers */}
                  <div style={{ flex: 1, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {group.numbers.map((num, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 14px',
                          borderRadius: 20,
                          background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {normalizeNum(num)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Section */}
          <div style={{ background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)', color: '#fff', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: '50%' }}>
                  <Receipt style={{ width: 20, height: 20 }} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 500 }}>ยอดรวมทั้งหมด</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {billTotal.toLocaleString()} บาท
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#f9fafb', padding: 16, textAlign: 'center', fontSize: 12, color: '#666' }}>
            <p style={{ margin: 0 }}>สิงโตทองคำ 77 ออนไลน์ © {new Date().getFullYear()} | ขอบคุณที่อุดหนุน</p>
          </div>
        </div>
      </div>
    </div>
  );
}
