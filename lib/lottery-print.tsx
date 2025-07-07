import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";

import { getThailandTime, getNextDrawDate } from "@/lib/utils/date-utils";
import { toZonedTime } from "date-fns-tz";

// --- START: Types adapted from page.tsx ---
interface LotterySubType {
  lottery_sub_type_id: number; // Or string, ensure consistency with your DB schema
  sub_type_name: string;
  multiplication_factor: number;
}

interface LotterySubNumber {
  id: number; // Or string
  lottery_sub_type_id: number; // Or string
  digit_number: number;
  type_number: string;
  price_paid: number;
}

// Define an interface for the item structure returned by the Supabase query
// This helps TypeScript understand the nested joined objects
interface SupabaseTicketItem {
  id: string; // or number
  ticket_id: string; // or number
  lottery_sub_type_id: number; // The FK in lottery_ticket_items
  lottery_sub_number_id: number; // The FK in lottery_ticket_items
  numbers: string[];
  amount: number;
  lottery_sub_types: LotterySubType; // Joined object
  lottery_sub_number: LotterySubNumber; // Joined object
}

interface PrintLotteryTicketItem {
  id: string; // or number
  numbers: string[];
  amount: number;
  lottery_sub_types: LotterySubType;
  lottery_sub_number: LotterySubNumber;
  // created_at?: string; // Add if needed
}

interface TicketDisplayItem { // For createGroups function
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
// --- END: Types adapted from page.tsx ---

interface ConsolidatedTicketPurchase {
  id: string;
  ticket_set_name: string | null;
  ticket_set_number: string;
  purchase_date: string;
  draw_date: string;
  draw_time: string;
  close_time?: string;
  deleted_at?: string | null;
  items: PrintLotteryTicketItem[]; // Updated to use richer item type
}

interface TicketPrintProps {
  purchase: ConsolidatedTicketPurchase;
  ticketSubTypes: TicketSubType[];
  user: any;
}

// This TicketSubType might be different from LotterySubType, review if it's still needed or can be merged.
// For now, keeping it as it might be used for other parts of the print logic not being replaced.
interface TicketSubType {
  id: string;
  type_name: string;
  multiplication_factor: number;
}

// Copied and adapted createGroups function from page.tsx
const createGroups = (ticketItems: TicketDisplayItem[], preferredOrderMap: Record<number, string[]> = {}) => {
  const allTypeLabels: Record<number, string[]> = {};

  // Build type labels mapping
  ticketItems.forEach(item => {
    const label = item.payout.type_number || "-";
    if (!allTypeLabels[item.payout.digit_number]) allTypeLabels[item.payout.digit_number] = [];
    if (!allTypeLabels[item.payout.digit_number].includes(label)) {
      allTypeLabels[item.payout.digit_number].push(label);
    }
  });

  // Order labels for specific digit numbers using preferredOrderMap from DB
  Object.keys(allTypeLabels).forEach(digitStr => {
    const digit = Number(digitStr);
    const labels = allTypeLabels[digit];
    let ordered: string[] = [...labels];
    // กำหนด fallback order ตาม digit
    let fallback: string[] = [];
    if (digit === 2) fallback = ["บน", "ล่าง"];
    else if (digit === 3 || digit === 4) fallback = ["บน", "โต๊ด"];
    else if (digit === 1) fallback = ["วิ่งบน", "วิ่งล่าง"];
    // ใช้ preferredOrderMap ถ้ามีและครบ
    if (preferredOrderMap[digit] && preferredOrderMap[digit].length >= fallback.length) {
      ordered = preferredOrderMap[digit].filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    } else if (fallback.length > 0) {
      ordered = fallback.filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    }
    allTypeLabels[digit] = ordered;

    // หลังจาก allTypeLabels[digit] = ordered; ให้แน่ใจว่า typeOrder มีครบ
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

  // สร้าง groups ใหม่
  const groups: Map<GroupKey, Grouped> = new Map();

  // 1. สร้าง mapping: {digit, number} => {typeLabel: amount}
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

  // 2. Group by digit + typeOrder + amounts signature
  Object.values(numberMap).forEach(({ digit, number, amounts }) => {
    const typeOrder = allTypeLabels[digit];
    // signature เช่น "10|30" (เช่น บน 10 ล่าง 30)
    // ปรับ amountsSignature ให้แสดง 0 ถ้าไม่มีการสั่งซื้อ label นั้น
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
// Function to calculate countdown text
function getCountdownTextForPrint(drawDateStr: string, closeTimeStr: string | undefined): string {
  if (!closeTimeStr || !drawDateStr) return "N/A";

  const now = new Date(); // Current local time

  // closeTimeStr is 'HH:mm:ss' or 'HH:mm'
  const [h, m, s] = closeTimeStr.split(":").map(Number);

  // drawDateStr is 'YYYY-MM-DD'
  // parseISO will interpret YYYY-MM-DD as YYYY-MM-DDT00:00:00.000Z (UTC midnight)
  const closeDate = parseISO(drawDateStr);
  // setHours will set the time in the local timezone of the environment (browser)
  closeDate.setHours(h, m, s || 0, 0);

  const diff = closeDate.getTime() - now.getTime();

  if (diff <= 0) return "หมดเวลา";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours > 0 ? hours + ' ชม. ' : ''}${minutes} นาที ${seconds} วินาที`.trim();
}
export const handlePrint = async ({ purchase, ticketSubTypes, user }: TicketPrintProps) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาตป๊อปอัพ');
    return;
  }
// Get countdown text
    const countdownText = getCountdownTextForPrint(purchase.draw_date, purchase.close_time);

  try {
    // Calculate total amount
    // This calculation might need to be revised based on how `purchase.items` amounts are structured
    // If each item in purchase.items is a specific bet, this should still be correct.
    const totalAmount = purchase.items.reduce((sum, item) => {
        // Assuming item.amount is the bet amount for that specific number and type combination
        return sum + item.amount;
    }, 0);

    // Format actual draw date from purchase data
    const formattedActualDrawDate = purchase.draw_date 
      ? format(parseISO(purchase.draw_date), "d MMMM yyyy", { locale: th })
      : "ไม่ระบุ";
    const THAILAND_TZ = "Asia/Bangkok";
    const purchaseDateObj = parseISO(purchase.purchase_date);
    const purchaseDateInThai = toZonedTime(purchaseDateObj, THAILAND_TZ);
    const formattedPurchaseDateTime = format(purchaseDateInThai, "d MMM yy HH:mm น.", { locale: th });
    const lotteryTypeName = purchase.items.length > 0 ? purchase.items[0].lottery_sub_types.sub_type_name : "ไม่ระบุประเภท";

    // Transform PrintLotteryTicketItem[] to TicketDisplayItem[] for createGroups
    const displayItems: TicketDisplayItem[] = purchase.items.map(item => ({
      subType: item.lottery_sub_types,
      payout: item.lottery_sub_number,
      numbers: item.numbers,
      amount: item.amount,
    }));

    const groups = createGroups(displayItems);

    // คำนวณยอดรวมบิลแบบถูกต้อง (เหมือนหน้าอื่น)
    const billTotal = Array.from(groups.values()).reduce((sum, group) => {
      return sum + group.typeOrder.reduce((s, label) => s + (group.amounts[label] ?? 0) * group.numbers.length, 0);
    }, 0);

    const newGroupedHtml = Array.from(groups.values()).map((group) => {
      const groupTotalForDisplay = group.typeOrder.reduce((sum, label) => {
        const amountForType = group.amounts[label] ?? 0;
        return sum + (amountForType * group.numbers.length);
      }, 0);

      return `
        <div class="ticket-group-item" style="display: flex; border-bottom: 1px solid #e5e7eb; padding: 8px 4px; font-size: 12px; background:rgba(20,83,45,0.04); border-radius: 8px; margin-bottom: 4px; box-shadow:0 1px 2px rgba(20,83,45,0.04);">
          <div class="group-info" style="width: 90px; text-align: center; padding-right: 8px; border-right: 2px dashed #22c55e; flex-shrink: 0;">
            <div style="font-weight: bold; color: #14532d; font-size: 15px;"><i class='fa fa-th-large' style='color:#22c55e; margin-right:2px;'></i>${group.digit_number} ตัว</div>
            <div style="color: #166534; font-size: 11px; font-weight:500;">${group.typeOrder.map(label => `<i class='fa fa-certificate' style='color:#facc15;'></i> ${label}`).join(" ")}</div>
            <div style="font-size: 11px; color:#14532d;">${group.typeOrder.map(label => (group.amounts[label] !== undefined ? group.amounts[label] : 0).toFixed(0)).join(" x ")}</div>
            <div style="font-size: 11px; color: #22c55e; font-weight:600;"><i class='fa fa-coins' style='color:#facc15;'></i> รวม: ${(group.typeOrder.reduce((sum, label) => sum + (group.amounts[label] !== undefined ? group.amounts[label] : 0), 0) * group.numbers.length).toFixed(0)}฿</div>
          </div>
          <div class="group-numbers" style="flex-grow: 1; padding-left: 12px; line-height: 1.7; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
            ${group.numbers.map(num => `<span style="background: linear-gradient(90deg,#22c55e 0%,#14532d 100%); color: #fff; padding: 2px 8px; border-radius: 6px; font-size:14px; font-weight:600; box-shadow:0 1px 2px rgba(20,83,45,0.10); display:inline-flex; align-items:center;"><i class='fa fa-ticket' style='margin-right:3px;'></i>${num}</span>`).join("")}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ใบเสร็จหวย ${purchase.ticket_set_number}</title>
          <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;700&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
          <style>
            body {
              font-family: 'Kanit', sans-serif;
              margin: 0;
              padding: 0;
              background: #f6fef8;
              color: #14532d;
              line-height: 1.5;
              font-size: 13px;
              transition: background 0.3s, color 0.3s;
            }
            .container {
              width: 150mm;
              margin: 10mm auto;
              border: 1px solid #22c55e;
              position: relative;
              background: #fff;
              box-shadow: 0 4px 16px rgba(20,83,45,0.10);
              border-radius: 16px;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size:42px;
              color: rgba(34,197,94,0.10);
              font-weight: 900;
              z-index: 0;
              pointer-events: none;
              letter-spacing: 2px;
              user-select: none;
            }
            .header {
              width: 100%;
              min-height: 32px;
              text-align: center;
              background: linear-gradient(90deg,#14532d 0%,#22c55e 100%);
              border-bottom: 4px solid #fff;
              padding-top: 8px;
              padding-bottom: 8px;
              margin-bottom: 8px;
              position: relative;
              z-index: 1;
              color: #fff;
              box-shadow: 0 2px 8px rgba(20,83,45,0.08);
            }
            .header h1 {
              font-size: 18px;
              font-weight: 700;
              margin: 0;
              color: #fff;
              letter-spacing: 1px;
              display: inline-block;
              vertical-align: middle;
            }
            .header .draw-date {
              font-size: 13px;
              color: #e5e7eb;
              margin-top: 2px;
            }
            .ticket-info {
              display: flex;
              flex-direction: column;
              gap: 6px;
              margin-bottom: 8px;
              padding: 0 16px;
              position: relative;
              z-index: 1;
              font-size: 13px;
            }
            .ticket-info-row {
              display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #22c55e; padding-bottom: 4px;
            }
            .ticket-info .icon {
              color: #22c55e; margin-right: 4px;
            }
            .ticket-number-barcode {
              height: 22px;
              width: 100%;
              text-align: center;
              font-family: 'Kanit', sans-serif;
              font-size: 14px;
              font-weight:600;
              letter-spacing: 2px;
              background: linear-gradient(90deg,#22c55e 0%,#14532d 100%);
              color: #fff;
              border-radius: 6px;
              margin-bottom: 8px;
              margin-top: 2px;
              position: relative;
              z-index: 1;
              box-shadow: 0 1px 4px rgba(20,83,45,0.10);
              display: flex; align-items: center; justify-content: center;
            }
            .total {
              text-align: center;
              font-size: 22px;
              font-weight: 700;
              margin-top: 8px;
              padding-top: 8px;
              width: 420px;
              height: 48px;
              border-radius: 12px;
              margin: 0 auto;
              position: relative;
              z-index: 1;
              background: linear-gradient(90deg,#14532d 0%,#22c55e 100%);
              color: #fff;
              box-shadow: 0 2px 8px rgba(20,83,45,0.10);
              display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .total .fa-coins { color: #facc15; margin-right: 4px; }
            .footer {
              text-align: center;
              margin-top: 12px;
              font-size: 11px;
              color: #166534;
              padding-top: 8px;
              position: relative;
              z-index: 1;
              background: linear-gradient(90deg,#f6fef8 0%,#d1fae5 100%);
              border-top: 1px solid #22c55e;
            }
            .footer p {
              margin: 2px 0;
            }
            @media print {
              body {
                margin: 0;
                background: #fff !important;
                color: #14532d !important;
              }
              .container {
                box-shadow: none;
                border: none;
                margin: 0 auto;
                background: #fff !important;
              }
              .header, .footer, .ticket-number-barcode, .ticket-group-item, .total {
                background: #fff !important;
                color: #14532d !important;
                box-shadow: none !important;
              }
              @page {
                size: 80mm auto;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="watermark"><i class='fa fa-leaf'></i> สิงโตทองคำ 77 ออนไลน์</div>
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <h1 style="font-size: 20px; margin: 0;font-weight: 700;color: #fff; letter-spacing:1px;"><i class='fa fa-receipt' style='margin-right:6px;'></i>บันทึกช่วยจำ</h1>
                <div style="border: 1px solid #fff; width: 120px; height: 28px; background-color: #22c55e; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-left:10px;"><h1 style="font-size: 15px; margin: 0;font-weight: 500;color: #fff; display:flex; align-items:center;"><i class='fa fa-user-circle' style='margin-right:4px;'></i>${user?.user_metadata?.name || "Guest"}</h1></div>
              </div>
            </div>
            <div class="ticket-info">
              <div class="ticket-info-row">
                <span style="font-weight: bold; font-size: 15px; color: #14532d;"><i class='fa fa-star icon'></i>${lotteryTypeName}</span>
                <span style="font-size: 13px; color: #166534;"><i class='fa fa-barcode icon'></i>บิล: ${purchase.ticket_set_number}</span>
              </div>
              <div class="ticket-info-row" style="border-bottom:none;">
                <span style="color: #166534;"><i class='fa fa-calendar icon'></i>งวด: ${formattedActualDrawDate} (เวลา ${purchase.draw_time || 'N/A'})</span>
                <span style="color: #166534;"><i class='fa fa-user icon'></i>ผู้ซื้อ: ${purchase.ticket_set_name || "ไม่มีชื่อ"}</span>
              </div>
              <div class="ticket-info-row">
                <span style="color: #22c55e; font-weight: bold; font-size: 13px;"><i class="fa fa-clock-o icon" aria-hidden="true"></i>ปิดรับใน:</span>
                <span style="color: #22c55e; font-weight: bold; font-size: 13px;">${countdownText}</span>
              </div>
              <div style="font-size: 12px; text-align: right; background-color: #e7fbe9; padding: 4px 8px; border-radius: 6px; color: #14532d; margin-top: 2px;">
                <i class='fa fa-calendar-check-o icon'></i>วันที่ซื้อ: ${formattedPurchaseDateTime}
              </div>
            </div>
            <div class="ticket-number-barcode"><i class='fa fa-smile-o' style='margin-right:6px;'></i>ขอบคุณที่อุดหนุน เฮงๆ รวยๆ ค่ะ</div>
            <div class="items-display" style="margin-top: 8px; margin-bottom: 8px;">${newGroupedHtml}</div>
            <div class="total">
              <i class='fa fa-money'></i>
               <span style="font-size: 16px; font-weight: 400; margin-left: 6px;">ยอดรวม:</span>
              <span style="font-size: 24px; font-weight: 800; font-family: 'Arial', sans-serif;">${billTotal.toFixed(0)}</span>
              <span style="font-size: 16px; font-weight: 400; margin-left: 6px;">บาท</span>
            </div>
            <div class="footer">
              <p><i class='fa fa-leaf'></i> สิงโตทองคำ 77 ออนไลน์ &copy; ${new Date().getFullYear()} | <i class='fa fa-phone'></i> ติดต่อแอดมิน</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    window.location.href = '/';
  } catch (err: any) {
    console.error('Error printing ticket:', err);
    toast.error('เกิดข้อผิดพลาดในการพิมพ์: ' + err.message);
    printWindow.close();
  }
};

export async function fetchTicketPurchase({ id, bill_number, supabase }: { id?: string; bill_number?: string; supabase: any }): Promise<ConsolidatedTicketPurchase | null> {
  let query = supabase
    .from("lottery_tickets")
    .select(`
      id,
      bill_number,
      bill_name,
      purchase_date,
      draw_date,
      draw_time,
      close_time,
      deleted_at,
      lottery_ticket_items!inner (
        id,
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_number_id,
        numbers,
        amount,
        created_at,
        updated_at,
        lottery_sub_types!inner (
          lottery_sub_type_id,
          sub_type_name,
          multiplication_factor
        ),
        lottery_sub_number!inner (
          id,
          lottery_sub_type_id,
          digit_number,
          type_number,
          price_paid
        )
      )
    `)
    .limit(1);
  if (id) query = query.eq("id", id);
  if (bill_number) query = query.eq("bill_number", bill_number);
  const { data, error } = await query;
  if (error) {
    toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล: " + error.message);
    return null;
  }
  if (!data || !data[0]) return null;
  const ticket = data[0];

  // ใช้ close_time ที่ดึงมาจาก ticket โดยตรง
  // หาก ticket.close_time เป็น null/undefined (สำหรับบิลเก่า) countdown จะยังคงแสดง N/A หรือตามตรรกะเดิมของ getCountdownTextForPrint

  // Explicitly cast the items array to the expected type before mapping
  const richItems: PrintLotteryTicketItem[] = (ticket.lottery_ticket_items as unknown as SupabaseTicketItem[] || []).map((item) => ({
    id: item.id,
    numbers: item.numbers || [],
    amount: typeof item.amount === 'number' ? item.amount : Number(item.amount),
    lottery_sub_types: {
      lottery_sub_type_id: item.lottery_sub_types.lottery_sub_type_id,
      sub_type_name: item.lottery_sub_types.sub_type_name,
      multiplication_factor: item.lottery_sub_types.multiplication_factor,
    },
    lottery_sub_number: {
      id: item.lottery_sub_number.id,
      lottery_sub_type_id: item.lottery_sub_number.lottery_sub_type_id,
      digit_number: item.lottery_sub_number.digit_number,
      type_number: item.lottery_sub_number.type_number,
      price_paid: typeof item.lottery_sub_number?.price_paid === 'number'
        ? item.lottery_sub_number.price_paid
        : Number(item.lottery_sub_number?.price_paid) || 0,
    },
    // created_at: item.created_at, // Add if needed
  }));

  return {
    id: ticket.id,
    ticket_set_name: ticket.bill_name,
    ticket_set_number: ticket.bill_number,
    purchase_date: ticket.purchase_date,
    draw_date: ticket.draw_date,
    draw_time: ticket.draw_time,
    close_time: ticket.close_time, // <<<< ใช้ close_time จาก ticket โดยตรง
    deleted_at: ticket.deleted_at,
    items: richItems,
  };
}

// ดึง preferred order ของแต่ละ digit จาก lottery_sub_types ใน Supabase
export async function getPreferredOrderMapFromDB(supabase: any): Promise<Record<number, string[]>> {
  // ดึงข้อมูลจาก lottery_sub_types (สมมุติว่ามี field digit_number, type_order หรือ type_labels)
  // ถ้าไม่มี type_order ใน DB ให้ดึงจาก lottery_sub_number แทน
  const { data, error } = await supabase
    .from('lottery_sub_number')
    .select('digit_number, type_number')
    .order('digit_number', { ascending: true })
    .order('type_number', { ascending: true });
  if (error) {
    console.error('Error fetching preferred order from DB:', error);
    return {};
  }
  // สร้าง mapping digit_number -> type_number[] (เรียงตามที่ดึงมา)
  const map: Record<number, string[]> = {};
  data.forEach((row: { digit_number: number; type_number: string }) => {
    if (!map[row.digit_number]) map[row.digit_number] = [];
    if (!map[row.digit_number].includes(row.type_number)) {
      map[row.digit_number].push(row.type_number);
    }
  });
  return map;
}

