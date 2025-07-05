// นำเข้า supabase client จาก supabaseClient.ts แทนการสร้างใหม่
import { createBrowserClient } from "@supabase/ssr"

// ส่งออก supabase client เดิมเพื่อให้โค้ดเดิมทำงานได้
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// สำหรับการใช้งานที่ต้องการ singleton instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}
