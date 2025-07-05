"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
// +++ 1. Import AlertDialog +++
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

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
  const [isPending, setIsPending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [aliasToDelete, setAliasToDelete] = useState<LotteryNameAlias | null>(null);

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
  
  // ลบ alias ฝั่ง client
  const handleConfirmDelete = async () => {
    if (!aliasToDelete || aliasToDelete.id === undefined) return;
    setIsPending(true);
    const { error } = await supabase
      .from("lottery_name_aliases")
      .delete()
      .eq("id", aliasToDelete.id);
    if (error) {
      alert("Delete error: " + (error.message || JSON.stringify(error)));
    } else {
      setAliases(prev => prev.filter(a => a.id !== aliasToDelete.id));
      setShowDeleteDialog(false);
      setAliasToDelete(null);
    }
    setIsPending(false);
  };
  
  // เพิ่ม/แก้ไข alias ฝั่ง client
  const handleSave = async () => {
    if (!editing) return;
    setIsPending(true);
    let error = null;
    if (editing.id) {
      // update
      const { error: updateError } = await supabase
        .from("lottery_name_aliases")
        .update({
          lottery_sub_type_id: Number(editing.lottery_sub_type_id),
          alias_name: editing.alias_name,
        })
        .eq("id", editing.id);
      error = updateError;
    } else {
      // insert
      const { error: insertError } = await supabase
        .from("lottery_name_aliases")
        .insert([
          {
            lottery_sub_type_id: Number(editing.lottery_sub_type_id),
            alias_name: editing.alias_name,
          },
        ]);
      error = insertError;
    }
    if (error) {
      alert("Save error: " + (error.message || JSON.stringify(error)));
    } else {
      toast.success("บันทึกสำเร็จ!");
      window.location.reload();
    }
    setIsPending(false);
  };

  return (
    <div className="w-full py-8 ml-4">
      <h1 className="text-2xl font-bold mb-6">จัดการ Lottery Name Aliases</h1>
      <div className="mb-8">
        <Button onClick={handleAdd} disabled={isPending}>
          + เพิ่ม Alias
        </Button>
      </div>

      <Drawer open={drawerOpen} onOpenChange={open => { if (!open) handleDrawerClose(); }} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing?.id ? "แก้ไข Alias" : "เพิ่ม Alias"}</DrawerTitle>
          </DrawerHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4 p-4"
          >
            <label>
              ประเภทหวย
              <select
                value={editing?.lottery_sub_type_id || ""}
                onChange={e =>
                  setEditing(editing => editing ? { ...editing, lottery_sub_type_id: e.target.value } : null)
                }
                required
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">เลือกประเภท</option>
                {subTypes.map(st => (
                  <option key={st.lottery_sub_type_id} value={st.lottery_sub_type_id}>
                    {st.sub_type_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alias Name
              <input
                type="text"
                value={editing?.alias_name || ""}
                onChange={e =>
                  setEditing(editing => editing ? { ...editing, alias_name: e.target.value } : null)
                }
                required
                className="border rounded px-2 py-1 w-full"
              />
            </label>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={handleDrawerClose} disabled={isPending}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-[600px] w-full text-xs text-left">
          <thead>
            {/* ... */}
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
                        <Button size="sm" variant="destructive" onClick={() => { setAliasToDelete(alias); setShowDeleteDialog(true); }} disabled={isPending}>ลบ</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* +++ 5. เพิ่ม AlertDialog Component +++ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ Alias <span className="font-bold">"{aliasToDelete?.alias_name}"</span>?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAliasToDelete(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "กำลังลบ..." : "ยืนยันการลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}