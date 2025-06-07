// app/api/lottery-history-by-name/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name'); // รับพารามิเตอร์เป็น name

  if (!name) {
    return new NextResponse(
      JSON.stringify({ error: 'Missing lottery name parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // ดึงข้อมูลโดยอ้างอิงจาก lottery_name
  const { data, error } = await supabase
    .from('lottery_api_results')
    .select('*')
    .eq('lottery_name', name)
    .order('draw_date', { ascending: false })
    .order('draw_time', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch data', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}