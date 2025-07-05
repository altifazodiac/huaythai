// นำเข้า supabase client จาก lib/supabase/supabaseClient.ts แทนการสร้างใหม่
import { supabase as supabaseInstance } from '@/lib/supabase/supabaseClient';

// ส่งออก supabase client เดิมเพื่อให้โค้ดเดิมทำงานได้
export const supabase = supabaseInstance;