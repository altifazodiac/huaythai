import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/supabaseClient";
import { getThailandTime, getNextDrawDate } from "@/lib/utils/date-utils";

// --- START: Types adapted from page.tsx ---
interface LotterySubType {
  lottery_sub_type_id: number; // Or string, ensure consistency with your DB schema
  sub_type_name: string;
}

interface LotterySubNumber {
  id: number; // Or string
  lottery_sub_type_id: number; // Or string
  digit_number: number;
  type_number: string;
  price_paid: number;
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
const createGroups = (ticketItems: TicketDisplayItem[]) => {
  const allTypeLabels: Record<number, string[]> = {};

  // Build type labels mapping
  ticketItems.forEach(item => {
    const label = item.payout.type_number || "-";
    if (!allTypeLabels[item.payout.digit_number]) allTypeLabels[item.payout.digit_number] = [];
    if (!allTypeLabels[item.payout.digit_number].includes(label)) {
      allTypeLabels[item.payout.digit_number].push(label);
    }
  });

  // Order labels for specific digit numbers
  Object.keys(allTypeLabels).forEach(digitStr => {
    const digit = Number(digitStr);
    const labels = allTypeLabels[digit];
    let ordered: string[] = [...labels];
    if (digit === 3 || digit === 4) {
      const preferredOrder = ["เต็ง", "โต๊ด", "บน"];
      ordered = preferredOrder.filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    } else if (digit === 2) {
      const preferredOrder = ["บน", "ล่าง", "เต็ง"];
      ordered = preferredOrder.filter(l => labels.includes(l));
      labels.forEach(l => { if (!ordered.includes(l)) ordered.push(l); });
    }
    allTypeLabels[digit] = ordered;
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
    const amountsSignature = typeOrder.map(label => amounts[label] || 0).join('|');
    const key = `${digit}|${typeOrder.join(",")}|${amountsSignature}`;

    if (!groups.has(key)) {
      groups.set(key, {
        digit_number: digit,
        numbers: [],
        typeLabels: typeOrder,
        amounts: Object.fromEntries(typeOrder.map((lab, idx) => [lab, amounts[lab] || 0])),
        typeOrder: typeOrder,
      });
    }
    const group = groups.get(key)!;
    if (!group.numbers.includes(number)) group.numbers.push(number);
  });

  return groups;
};

export const handlePrint = async ({ purchase, ticketSubTypes, user }: TicketPrintProps) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาตป๊อปอัพ');
    return;
  }

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
    const formattedPurchaseDateTime = format(parseISO(purchase.purchase_date), "d MMM yy HH:mm น.", { locale: th });
    const lotteryTypeName = purchase.items.length > 0 ? purchase.items[0].lottery_sub_types.sub_type_name : "ไม่ระบุประเภท";

    // Transform PrintLotteryTicketItem[] to TicketDisplayItem[] for createGroups
    const displayItems: TicketDisplayItem[] = purchase.items.map(item => ({
      subType: item.lottery_sub_types,
      payout: item.lottery_sub_number,
      numbers: item.numbers,
      amount: item.amount,
    }));

    const groups = createGroups(displayItems);

    const newGroupedHtml = Array.from(groups.values()).map((group) => {
      const groupTotalForDisplay = group.typeOrder.reduce((sum, label) => {
        const amountForType = group.amounts[label] ?? 0;
        return sum + (amountForType * group.numbers.length);
      }, 0);

      return `
        <div class="ticket-group-item" style="display: flex; border-bottom: 1px solid #eee; padding: 4px 2px; font-size: 11px;">
          <div class="group-info" style="width: 90px; text-align: center; padding-right: 5px; border-right: 1px dashed #ccc; flex-shrink: 0;">
            <div style="font-weight: bold;">${group.digit_number} ตัว</div>
            <div style="color: #d32f2f; font-size: 10px;">${group.typeOrder.join(" x ")}</div>
            <div style="font-size: 10px;">${group.typeOrder.map(label => (group.amounts[label] ?? 0).toFixed(0)).join(" x ")}</div>
            <div style="font-size: 10px; color: #555;">รวม: ${(group.typeOrder.reduce((sum, label) => sum + (group.amounts[label] ?? 0), 0) * group.numbers.length).toFixed(0)}฿</div>
          </div>
          <div class="group-numbers" style="flex-grow: 1; padding-left: 8px; line-height: 1.5; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
            ${group.numbers.map(num => `<span style="background-color: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size:12px;">${num}</span>`).join("")}
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
              background: rgb(223, 223, 223);
              color: #333;
              line-height: 1.4;
              font-size: 12px;
            }
            .container {
              width: 150mm;
              margin: 10mm auto;
              border: 1px solid #ddd;
              position: relative;
              background: rgb(223, 223, 223);
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 32px;
              color: rgba(0, 0, 0, 0.1);
              font-weight: 700;
              z-index: 0;
              pointer-events: none;
            }
            .header {
              width: 100%;
              height: 18px;
              text-align: center;
              background: rgb(203, 236, 255);
              border-bottom: 4px solid #fff;
              padding-top: 3mm;
              padding-bottom: 3mm;
              margin-bottom: 3mm;
              position: relative;
              z-index: 1;
            }
            .header h1 {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
              color: #d32f2f;
            }
            .header .draw-date {
              font-size: 12px;
              color: #555;
              margin-top: 2px;
            }
            .ticket-info {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #555;
              margin-bottom: 3mm;
              position: relative;
              z-index: 1;
            }
            .ticket-number-barcode {
              height: 18px;
              width: 450px;
              text-align: center;
              font-family: 'Kanit', sans-serif;
              font-size: 12px;
              font-weight:semibold;
              letter-spacing: 2px;
              background:rgb(79, 210, 243);
              margin-left: 55px;
              color: rgb(240, 40, 40);
              border-radius: 3px;
              margin-bottom: -5mm;
              position: relative;
              z-index: 1;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 3mm;
              position: relative;
              z-index: 1;
            }
            .items-table th,
            .items-table td {
              padding: 1mm 2mm;
              text-align: left;
              font-size: 11px;
            }
            .items-table tr {
              border-bottom: 1px solid #ddd;
            }
            .items-table th {
              background: #f5f5f5;
              font-weight: 600;
              color: #333;
            }
            .ticket-numbers {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
            }
            .ticket-numbers .number-group {
              display: inline-flex;
              gap: 2px;
            }
            .ticket-numbers .number-group span {
              display: inline-block;
              width: 14px;
              height: 14px;
              line-height: 14px;
              text-align: center;
              background: #e0f2fe;
              color: #1976d2;
              border-radius: 2px;
              font-weight: 500;
              font-size: 10px;
            }
            .matching-tickets {
              margin-top: 3mm;
              padding: 2mm;
              background: rgb(223, 223, 223);
              border-radius: 3px;
              font-size: 11px;
            }
            .matching-tickets h3 {
              margin: 0 0 2mm 0;
              color: #e65100;
              font-size: 12px;
            }
            .matching-tickets table {
              width: 100%;
              border-collapse: collapse;
            }
            .matching-tickets td {
              padding: 1mm;
              border-bottom: 1px solid rgb(223, 223, 223);
            }
            .total {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              margin-top: 3mm;
              padding-top: 2mm;
              width: 400px;
              height: 40px;
              border-radius: 0px;
              margin: 0 auto;
              position: relative;
              z-index: 1;
            }
            .footer {
              text-align: center;
              margin-top: 5mm;
              font-size: 10px;
              color: #777;
              padding-top: 3mm;
              position: relative;
              z-index: 1;
            }
            .footer p {
              margin: 1mm 0;
            }
            @media print {
              body {
                margin: 0;
              }
              .container {
                box-shadow: none;
                border: none;
                margin: 0 auto;
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
            <div class="watermark">หวยไทย ออนไลน์</div>
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <h1 style="font-size: 16px; margin: 0;font-weight: 300;color: #000;">บันทึกช่วยจำ</h1>
                <div style="border: 1px solid rgb(81, 198, 245); width: 100px; height: 20px; background-color: #fff;"><h1 style="font-size: 14px; margin: 0;font-weight: 200;color: #bbbbbb;">${user?.user_metadata?.name || "Guest"}</h1></div>
              </div>
            </div>
            <div class="ticket-info" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 3mm; padding: 0 10px; position: relative; z-index: 1; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 4px;">
                <span style="font-weight: bold; font-size: 14px; color: #d32f2f;">${lotteryTypeName}</span>
                <span style="font-size: 12px; color: #333;">บิล: ${purchase.ticket_set_number}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #555;">งวด: ${formattedActualDrawDate} (เวลา ${purchase.draw_time || 'N/A'})</span>
                <span style="color: #555;">ผู้ซื้อ: ${purchase.ticket_set_name || "ไม่มีชื่อ"}</span>
              </div>
              <div style="font-size: 11px; text-align: right; background-color: #fff8e1; padding: 4px 6px; border-radius: 3px; color: #5d4037; margin-top: 2px;">
                วันที่ซื้อ: ${formattedPurchaseDateTime}
              </div>
            </div>
            
            <div class="ticket-number-barcode">****ขอบคุณที่อุดหนุน เฮงๆ รวยๆ ค่ะ****</div>
            <div class="items-display" style="margin-top: 3mm; margin-bottom: 3mm;">${newGroupedHtml}</div>
            <div class="total" style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <div style="font-size: 16px; font-weight: 400; background-color:rgb(236, 236, 236);color: rgb(131, 131, 131); border-radius: 0px;height: 30px;width: 80px;padding-top: 10px;">ยอดรวม</div>
              <div style="font-size: 18px; font-weight: 800; background-color:rgb(209, 208, 208);color: rgb(56, 148, 201); border-radius: 0px;height: 30px;width: 200px;padding-top: 10px;">${totalAmount.toFixed(0)} ฿</div>
              <div style="font-size: 16px; font-weight: 400; background-color:rgb(236, 236, 236); color: rgb(133, 133, 133);border-radius: 0px;height: 30px;width: 80px;padding-top: 10px;">บาท</div>
            </div>
            <div class="footer">
             
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } catch (err: any) {
    console.error('Error printing ticket:', err);
    toast.error('เกิดข้อผิดพลาดในการพิมพ์: ' + err.message);
    printWindow.close();
  }
};

export async function fetchTicketPurchase({ id, bill_number }: { id?: string; bill_number?: string }): Promise<ConsolidatedTicketPurchase | null> {
  let query = supabase
    .from("lottery_tickets")
    .select(`
      id,
      bill_number,
      bill_name,
      purchase_date,
      draw_date,
      draw_time,
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

  const richItems: PrintLotteryTicketItem[] = (ticket.lottery_ticket_items || []).map((item: any) => ({
    id: item.id,
    numbers: item.numbers || [],
    amount: typeof item.amount === 'number' ? item.amount : Number(item.amount),
    lottery_sub_types: {
      lottery_sub_type_id: item.lottery_sub_types?.lottery_sub_type_id,
      sub_type_name: item.lottery_sub_types?.sub_type_name,
      // multiplication_factor: item.lottery_sub_types?.multiplication_factor, // Keep if needed elsewhere
    },
    lottery_sub_number: {
      id: item.lottery_sub_number?.id,
      lottery_sub_type_id: item.lottery_sub_number?.lottery_sub_type_id,
      digit_number: item.lottery_sub_number?.digit_number,
      type_number: item.lottery_sub_number?.type_number,
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
    deleted_at: ticket.deleted_at,
    items: richItems,
  };
}
