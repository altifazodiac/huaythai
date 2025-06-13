// app/admin/lottery-typeof-api/actions.ts

"use server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// +++ กำหนด Type ที่จะ Return สำหรับ upsert +++
type UpsertResult = Promise<{
  data: any | null;
  error: any | null;
}>;

// +++ กำหนด Type ที่จะ Return สำหรับ delete +++
type DeleteResult = Promise<{
  error: any | null;
}>;

// +++ เพิ่ม Return Type ให้กับฟังก์ชัน +++
export async function upsertAlias({ id, sub_type_id, api_name }: { id?: number, sub_type_id: string, api_name: string }): UpsertResult {
  const supabase = createServerComponentClient({ cookies: async () => await cookies() });
  
  try {
    let query;
    const payload = { sub_type_id: Number(sub_type_id), api_name };

    if (id) {
      query = supabase.from("lottery_name_aliases").update(payload).eq("id", id);
    } else {
      query = supabase.from("lottery_name_aliases").insert([payload]);
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error("Supabase Upsert Error:", error);
      return { data: null, error: error };
    }
    
    // อย่าลืมเปลี่ยน path ให้ถูกต้อง
    revalidatePath("/admin/lottery-typeof-api"); 
    return { data, error: null };

  } catch (e: any) {
    console.error("Catch Block Error:", e);
    return { data: null, error: e };
  }
}

// +++ เพิ่ม Return Type ให้กับฟังก์ชัน +++
export async function deleteAlias(id: number): Promise<any> {
  const supabase = createServerComponentClient({ cookies: async () => await cookies() });
  
  try {
    const { error } = await supabase.from("lottery_name_aliases").delete().eq("id", id);

    if (error) {
      console.error("Supabase Delete Error:", error);
      return { error: error };
    }
    
    // อย่าลืมเปลี่ยน path ให้ถูกต้อง
    revalidatePath("/admin/lottery-typeof-api");
    return { error: null };

  } catch (e: any) {
    console.error("Catch Block Error:", e);
    return { error: e };
  }
}