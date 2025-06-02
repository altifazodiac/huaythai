"use client";
import { useEffect, Suspense } from "react"; // Ensure Suspense is imported
import { useSearchParams } from "next/navigation";
import { fetchTicketPurchase, handlePrint } from "@/lib/lottery-print";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-require-auth";

// This component contains the actual client-side logic using searchParams
function PrintTicketClientLogic() {
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
      // Ensure ticket_set_name exists or provide a default.
      // Placeholder for ticketSubTypes, might need actual data.
      await handlePrint({ 
        purchase, 
        ticketSubTypes: [], 
        user: { user_metadata: { name: purchase.ticket_set_name || 'ผู้ซื้อ' } } 
      });
    }
    print();
  }, [bill_number]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-blue-600 font-medium">กำลังเตรียมข้อมูลสำหรับพิมพ์...</span>
    </div>
  );
}

// This is the default export for the page.
// It wraps the client-side logic component with Suspense.
export default function PrintTicketPage() {
  useRequireAuth();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500 font-medium">กำลังโหลดข้อมูลบิล...</span>
      </div>
    }>
      <PrintTicketClientLogic />
    </Suspense>
  );
}