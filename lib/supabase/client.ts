 import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

export const createClient = () => {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = 'https://bqgiwmawqnixpgvuqhuc.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2l3bWF3cW5peHBndnVxaHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NTMzNjksImV4cCI6MjA2MDEyOTM2OX0.OYDTDXPASeTRCuYE0dL69hq_lY9-8UMVip7TK0RD8V8';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey)
  return supabaseClient
}
