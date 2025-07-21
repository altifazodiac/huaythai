import { createBrowserClient } from "@supabase/ssr"

// ส่งออก supabase client เดิมเพื่อให้โค้ดเดิมทำงานได้
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bqgiwmawqnixpgvuqhuc.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2l3bWF3cW5peHBndnVxaHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NTMzNjksImV4cCI6MjA2MDEyOTM2OX0.OYDTDXPASeTRCuYE0dL69hq_lY9-8UMVip7TK0RD8V8'
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// สำหรับการใช้งานที่ต้องการ singleton instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}
