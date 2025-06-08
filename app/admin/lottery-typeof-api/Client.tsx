"use client";
import { useState, useTransition } from "react";
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

// สร้าง Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LotterySubType {
  lottery_sub_type_id: number;
  lottery_type_id: number;
  sub_type_name: string;
  country_origin?: string;
  reference_source?: string;
  notes?: string;
}

interface LotteryNameAlias {
  id?: number;
  lottery_sub_type_id: string;
  alias_name: string;
}

interface LotteryTypeofApiClientProps {
  subTypes: LotterySubType[];
  apiNames: string[];
  aliases: LotteryNameAlias[];
}

export default function LotteryTypeofApiClient({ subTypes, apiNames, aliases: initialAliases }: LotteryTypeofApiClientProps) {
  const [aliases, setAliases] = useState<LotteryNameAlias[]>(
    initialAliases.map(a => ({ ...a, lottery_sub_type_id: String(a.lottery_sub_type_id) }))
  );
  const [editing, setEditing] = useState<LotteryNameAlias | null>(null);
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEdit = (alias: LotteryNameAlias) => {
    setEditing(alias);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditing({ lottery_sub_type_id: "", alias_name: "", id: undefined });
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = (id?: number) => {
    if (id === undefined) return;
    startTransition(async () => {
      const { error } = await supabase
        .from('lottery_name_aliases')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Supabase delete error:", error);
        alert("เกิดข้อผิดพลาดในการลบรายการ: " + (error.message || "ไม่ทราบสาเหตุ"));
        return;
      }
      setAliases((prev: LotteryNameAlias[]) => prev.filter((a) => a.id !== id));
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    const payload = {
      lottery_sub_type_id: Number(editing.lottery_sub_type_id),
      alias_name: editing.alias_name,
    };

    let saved: LotteryNameAlias | null = null;

    if (editing.id) {
      // UPDATE
      const { data, error } = await supabase
        .from('lottery_name_aliases')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error, "Payload:", payload);
        alert("เกิดข้อผิดพลาดในการอัปเดตรายการ: " + (error.message || "ไม่ทราบสาเหตุ"));
        return;
      }
      saved = data;
      setAliases((prev) =>
        prev.map((a) => (a.id === editing.id ? saved! : a))
      );
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('lottery_name_aliases')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error, "Payload:", payload);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (error.message || "ไม่ทราบสาเหตุ"));
        return;
      }
      saved = data;
      setAliases((prev) => [...prev, saved!]);
    }

    setEditing(null);
    setDrawerOpen(false);
  };

  return (
    <div className="w-full py-8 ml-4">
      <h1 className="text-2xl font-bold mb-6">จัดการ Lottery Name Aliases</h1>
      <div className="mb-8">
        <Button onClick={handleAdd}>
          + เพิ่ม Alias
        </Button>
      </div>
      <Drawer open={drawerOpen} onOpenChange={open => { if (!open) handleDrawerClose(); }} direction="right">
        <DrawerContent className="max-w-md w-full">
          <DrawerHeader>
            <DrawerTitle>{editing && editing.id ? "แก้ไข Alias" : "เพิ่ม Alias"}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" className="absolute right-2 top-2" onClick={handleDrawerClose}>ปิด</Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4">
            {editing && (
              <div className="mb-8">
                <div className="mb-2">
                  <label className="block mb-1">Lottery Sub Type</label>
                  <Select
                    value={editing.lottery_sub_type_id}
                    onValueChange={value => setEditing((ed) => ed ? { ...ed, lottery_sub_type_id: value } : null)}
                  >
                    <SelectTrigger>{subTypes.find((st) => String(st.lottery_sub_type_id) === editing.lottery_sub_type_id)?.sub_type_name || "เลือกประเภท"}</SelectTrigger>
                    <SelectContent>
                      {subTypes.map((st) => (
                        <SelectItem key={st.lottery_sub_type_id} value={String(st.lottery_sub_type_id)}>{st.sub_type_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-2">
                  <label className="block mb-1">API Name (จาก lottery_api_results)</label>
                  <Select
                    value={editing.alias_name}
                    onValueChange={value => setEditing((ed) => ed ? { ...ed, alias_name: value } : null)}
                  >
                    <SelectTrigger>{editing.alias_name || "เลือก API Name"}</SelectTrigger>
                    <SelectContent>
                      {apiNames.map((n: string) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSave} disabled={isPending || !editing.lottery_sub_type_id || !editing.alias_name}>
                    บันทึก
                  </Button>
                  <Button variant="outline" onClick={handleDrawerClose} disabled={isPending}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-[600px] w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border p-3 font-semibold text-center w-12">No.</th>
              <th className="border p-3 font-semibold">Lottery Sub Type</th>
              <th className="border p-3 font-semibold">API Name</th>
              <th className="border p-3 font-semibold text-center w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {aliases.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-8">ไม่พบข้อมูล Alias ในระบบ</td>
              </tr>
            ) : (
              aliases.map((alias, idx) => {
                const subType = subTypes.find((st) => String(st.lottery_sub_type_id) === alias.lottery_sub_type_id);
                return (
                  <tr key={alias.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{subType ? subType.sub_type_name : <span className="text-slate-400">-</span>}</td>
                    <td className="border p-2">{alias.alias_name}</td>
                    <td className="border p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(alias)} disabled={isPending}>แก้ไข</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(alias.id)} disabled={isPending}>ลบ</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 