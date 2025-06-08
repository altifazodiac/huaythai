"use server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function upsertAlias({ id, sub_type_id, api_name }: { id?: number, sub_type_id: string, api_name: string }) {
  const supabase = createServerComponentClient({ cookies });
  if (id) {
    // update
    await supabase.from("lottery_name_aliases").update({ sub_type_id, api_name }).eq("id", id);
  } else {
    // create
    await supabase.from("lottery_name_aliases").insert([{ sub_type_id, api_name }]);
  }
}

export async function deleteAlias(id: number) {
  const supabase = createServerComponentClient({ cookies });
  await supabase.from("lottery_name_aliases").delete().eq("id", id);
} 