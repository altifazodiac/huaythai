import { createBrowserClient } from "@supabase/ssr"

// Supabase configuration with fallback values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wbvgdqiozztgqodtajui.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZHZ4b3F2dGRpbXR1ZmF4c3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NTMzNjksImV4cCI6MjA2MDEyOTM2OX0.OYDTDXPASeTRCuYE0dL69hq_lY9-8UMVip7TK0RD8V8"

// Log configuration for debugging
console.log('🔧 Supabase Config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseKey ? 'Set' : 'Missing',
  env: process.env.NODE_ENV || 'development'
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase configuration is missing. Please check your environment variables.")
}

// สำหรับ client components - ใช้ createBrowserClient จาก @supabase/ssr
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// Export the URL and key for server-side usage if needed
export { supabaseUrl, supabaseKey }

// Export a function to create a new client instance if needed
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseKey)
