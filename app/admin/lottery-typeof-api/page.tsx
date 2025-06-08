import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import LotteryTypeofApiClient from "./Client";

export default async function LotteryTypeofApiPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: subTypes } = await supabase.from("lottery_sub_types").select();
  const { data: apiNamesRaw } = await supabase.from("lottery_api_results").select("lottery_name");
  const { data: aliases } = await supabase.from("lottery_name_aliases").select("id, lottery_sub_type_id, alias_name");

  const apiNames = Array.from(new Set((apiNamesRaw || []).map((a: any) => a.lottery_name)));

  return (
    <LotteryTypeofApiClient
      subTypes={subTypes || []}
      apiNames={apiNames}
      aliases={aliases || []}
    />
  );
}