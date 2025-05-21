import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/supabaseClient";
import { getThailandTime, getNextDrawDate } from "@/lib/utils/date-utils";

interface TicketPurchaseItem {
  id: string;
  ticket_sub_type_id: string;
  ticket_number: string;
  amount: number;
  price: number;
  total: number;
  created_at: string;
  sub_type_name?: string;
}

interface ConsolidatedTicketPurchase {
  id: string;
  ticket_set_name: string | null;
  ticket_set_number: string;
  purchase_date: string;
  deleted_at?: string | null;
  items: TicketPurchaseItem[];
}

interface TicketSubType {
  id: string;
  type_name: string;
  multiplication_factor: number;
}

interface MatchingTicket {
  tod_number: string;
  teng_number: string;
  amount_display: string;
  digit_label: string;
  type_label: string;
}

interface GroupedPurchaseItem {
  ticket_numbers: string[];
  amount: number;
}

interface GroupedItems {
  [key: string]: GroupedPurchaseItem[];
}

interface TicketPrintProps {
  purchase: ConsolidatedTicketPurchase;
  ticketSubTypes: TicketSubType[];
  user: any;
}
type Ticket = {
  amount_display: string;
  teng_number?: string;
  tod_number?: string;
  two_digit_top_number?: string;
  two_digit_bottom_number?: string;
  run_top_number?: string;
  run_bottom_number?: string;
  three_digit_front_number?: string;
  three_digit_back_number?: string;
  pair_three_digit_number?: string;
  pair_two_digit_number?: string;
  pair_run_number?: string;
  pair_three_digit_front_back_number?: string;
}
const fetchMatchingTickets = async (ticketSetNumber: string): Promise<MatchingTicket[] | null> => {
  try {
    const { data, error } = await supabase.rpc('get_matching_tickets', {
      p_ticket_set_number: ticketSetNumber
    });

    if (error) throw error;
    return data as MatchingTicket[];
  } catch (err: any) {
    console.error('Error fetching matching tickets:', err);
    toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message);
    return null;
  }
};

const groupedPurchaseItems = (items: TicketPurchaseItem[]): GroupedItems => {
  // Step 1: Group by sub_type_name
  const groupedByType = items.reduce((acc, item) => {
    const group = item.sub_type_name || "ไม่ทราบประเภท";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, TicketPurchaseItem[]>);

  // Step 2: Within each group, group ticket_numbers by amount
  const finalGrouped = Object.entries(groupedByType).reduce((acc, [groupName, groupItems]) => {
    const groupedByAmount: GroupedPurchaseItem[] = [];
    groupItems.forEach(item => {
      const existingGroup = groupedByAmount.find(g => g.amount === item.amount);
      if (existingGroup) {
        existingGroup.ticket_numbers.push(item.ticket_number);
      } else {
        groupedByAmount.push({
          ticket_numbers: [item.ticket_number],
          amount: item.amount,
        });
      }
    });
    acc[groupName] = groupedByAmount;
    return acc;
  }, {} as GroupedItems);

  return finalGrouped;
};

export const handlePrint = async ({ purchase, ticketSubTypes, user }: TicketPrintProps) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาตป๊อปอัพ');
    return;
  }

  try {
    // Fetch matching tickets data
    const matchingTickets = await fetchMatchingTickets(purchase.ticket_set_number);
    
    // Calculate total amount
    const totalAmount = purchase.items.reduce((sum, item) => sum + item.amount, 0);

    // Get draw date
    const thailandTime = getThailandTime();
    const drawDate = await getNextDrawDate(supabase, thailandTime);
    const formattedDrawDate = format(parseISO(drawDate), "d MMMM yyyy", { locale: th });

    const matchingTicketsHtml = matchingTickets && matchingTickets.length > 0 
    ? `
      <div class="matching-tickets">
        <table>
          ${(() => {
            // Group by type_label + amount_display
            const grouped = matchingTickets.reduce((acc, ticket) => {
              const key = ticket.digit_label + '|' + ticket.type_label + '|' + ticket.amount_display;
              if (!acc[key]) acc[key] = [];
              acc[key].push(ticket);
              return acc;
            }, {} as Record<string, MatchingTicket[]>);

            return Object.entries(grouped).map(([key, tickets]) => {
              const [digitLabel, typeLabel, amountDisplay] = key.split('|');
              const displayNumbers = tickets.map(t => {
                if (t.tod_number && t.teng_number && t.tod_number !== t.teng_number) {
                  return `${t.tod_number} ${t.teng_number}`;
                } else {
                  return t.tod_number || t.teng_number;
                }
              }).join(' ');
              return `
                <tr>
                  <td style="text-align: center;width: 75px;">
                    <div style="font-size: 14px; background-color:rgb(65, 202, 76); color: white; padding: 2px 2px; border-radius: 5px;font-weight: 600;">${typeLabel}</div>
                     <div style="font-size: 12px;color: rgb(241, 34, 34);">${digitLabel}</div>
                    <div style="font-size: 12px;">${amountDisplay}</div>
                  </td>
                  <td>
                    <div style="font-size: 14px; border: 1px solid rgb(56, 190, 243); padding: 2px 5px; border-radius: 5px;height: 45px;overflow-y: auto;background-color:rgb(245, 245, 245);width: 420px;">
                      ${displayNumbers}
                    </div>
                  </td>
                  <td style="text-align: right;width: 10px;">
                    <div style="text-align: right;margin-right: 2px;"><i class="fa fa-trash-o" style="font-size:20px;color:red"></i></div>
                  </td>
                </tr>
              `;
            }).join('');
          })()}
        </table>
      </div>
    ` : '';
  


    const groupedItems = groupedPurchaseItems(purchase.items);
    const itemsHtml = Object.entries(groupedItems)
      .map(([groupName, groupedItems], groupIndex) => {
        let rowIndex = groupIndex > 0 
          ? Object.entries(groupedItems).slice(0, groupIndex).reduce((sum, [, items]) => sum + (items as unknown as GroupedPurchaseItem[]).length, 0) 
          : 0;
        
        return groupedItems
          .reduce((acc: GroupedPurchaseItem[], group) => {
            const lastGroup = acc[acc.length - 1];
            if (lastGroup && lastGroup.amount === group.amount) {
              lastGroup.ticket_numbers.push(...group.ticket_numbers);
            } else {
              acc.push({ ...group });
            }
            return acc;
          }, [] as GroupedPurchaseItem[])
          .map((group) => {
            rowIndex++;
            return `
              <tr>
                <td>${rowIndex}.</td>
                <td>${groupName}x${
                  (() => {
                    const subType = ticketSubTypes.find(type => type.type_name === groupName);
                    return subType ? subType.multiplication_factor : "";
                  })()
                }</td>
                <td class="ticket-numbers">
                  ${group.ticket_numbers
                    .map(number => `
                      <div class="number-group">
                        ${number
                          .split(" ")
                          .map(digit => `<span>${digit}</span>`)
                          .join("")}
                      </div>
                    `)
                    .join(" ")}
                </td>
                <td>x${group.amount.toFixed(0)} ฿</td>
              </tr>
            `;
          })
          .join("");
      })
      .join("");

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
            <div class="ticket-info">
              <div class="draw-date" style="margin-left: 10px;">งวด ${formattedDrawDate}</div>
              <span>ผู้ซื้อ: ${purchase.ticket_set_name || "ไม่มีชื่อ"}</span>
              <span>บิล: ${purchase.ticket_set_number}</span>
              <div style="background-color: rgb(237, 240, 76);margin-right:10px"><span>วันที่ซื้อ: ${new Date(purchase.purchase_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            </div>
            <div class="ticket-info">
            </div>
            <div class="ticket-number-barcode">****ขอบคุณที่อุดหนุน เฮงๆ รวยๆ ค่ะ****</div>
            ${matchingTicketsHtml}
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

