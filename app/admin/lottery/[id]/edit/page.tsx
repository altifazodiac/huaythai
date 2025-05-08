import { supabase } from "@/lib/supabase/supabaseClient"
import { LotteryForm } from "@/components/lottery/lottery-form"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from 'lucide-react'
import Link from "next/link"
import { notFound } from "next/navigation"
 
// Add the correct type for the params
interface PageProps {
  params: {
    id: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function EditLotteryPage({
  params,
}: PageProps) {
  const { data: result, error } = await supabase
    .from("lottery_results")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !result) {
    notFound();
  }

  const { data: numbers } = await supabase
    .from("lottery_numbers")
    .select("*")
    .eq("lottery_result_id", params.id);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Link href={`/admin/lottery/${params.id}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>กลับ</span>
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">แก้ไขผลสลากกินแบ่ง</h1>
      </div>

      <LotteryForm
        initialData={{
          ...result,
          lottery_numbers: numbers || [],
        }}
      />
    </div>
  )
}