"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchTicketPurchase, handlePrint } from "@/lib/lottery-print";

import { toast } from "sonner";
export default function PrintTicketPage() {
  const searchParams = useSearchParams();
  const bill_number = searchParams.get("bill_number");

  useEffect(() => {
    async function print() {
      if (!bill_number) {
        toast.error("ไม่พบเลขบิล");
        return;
      }
      const purchase = await fetchTicketPurchase({ bill_number });
      if (!purchase) {
        toast.error("ไม่พบข้อมูลบิล");
        return;
      }
      await handlePrint({ purchase, ticketSubTypes: [], user: { user_metadata: { name: purchase.ticket_set_name } } });
    }
    print();
  }, [bill_number]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-blue-600 font-medium">กำลังเตรียมข้อมูลสำหรับพิมพ์...</span>
    </div>
  );
}
