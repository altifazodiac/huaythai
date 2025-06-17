"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import BillDetailDrawer from "@/components/lottery/BillDetailDrawer";

interface RemoveLog {
  id: number;
  user_id: string;
  bill_number: string;
  group_info: any;
  removed_at: string;
  reason: string;
  draw_date?: string;
  close_time?: string;
  schedule_id?: number;
  schedule?: any;
}

interface SoftDeletedTicket {
  id: string;
  user_id: string;
  bill_number: string;
  bill_name?: string;
  draw_date?: string;
  close_time?: string;
  deleted_at: string;
}

export default function RemoveLogsPage() {
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [logs, setLogs] = useState<RemoveLog[]>([]);
  const [softDeletedTickets, setSoftDeletedTickets] = useState<SoftDeletedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RemoveLog | null>(null);
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string | null>(null);

  async function fetchLogs() {
    setLoading(true);
    let query = supabase
      .from("lottery_ticket_remove_logs")
      .select("*", { count: "exact" })
      .order("removed_at", { ascending: false });
    if (dateFrom) {
      query = query.gte("removed_at", dateFrom + "T00:00:00.000Z");
    }
    if (dateTo) {
      query = query.lte("removed_at", dateTo + "T23:59:59.999Z");
    }
    const { data, error } = await query;
    if (!error && data) setLogs(data as RemoveLog[]);
    setLoading(false);
  }

  async function fetchSoftDeletedTickets() {
    setLoading(true);
    let query = supabase
      .from("lottery_tickets")
      .select("id, user_id, bill_number, bill_name, draw_date, close_time, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (dateFrom) {
      query = query.gte("deleted_at", dateFrom + "T00:00:00.000Z");
    }
    if (dateTo) {
      query = query.lte("deleted_at", dateTo + "T23:59:59.999Z");
    }
    const { data, error } = await query;
    if (!error && data) setSoftDeletedTickets(data as SoftDeletedTicket[]);
    setLoading(false);
  }

  async function fetchLogsAndSoftDeleted() {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchSoftDeletedTickets()]);
    setLoading(false);
  }

  async function handleRestore(ticketId: string) {
    setRestoringId(ticketId);
    const { error } = await supabase
      .from('lottery_tickets')
      .update({ deleted_at: null })
      .eq('id', ticketId);
    if (!error) {
      fetchLogsAndSoftDeleted();
      alert('กู้คืนสำเร็จ');
    } else {
      alert('เกิดข้อผิดพลาดในการกู้คืน');
    }
    setRestoringId(null);
  }

  function formatGroupInfo(groupInfo: any): string {
    if (!groupInfo) return "-";
    let result = "";
    if (groupInfo.amounts) {
      result += `จำนวนเงิน: ${Object.entries(groupInfo.amounts).map(([k, v]) => `${k}: ${v}`).join(", ")}` + "\n";
    }
    if (groupInfo.numbers && Array.isArray(groupInfo.numbers)) {
      result += `เลขที่ซื้อ: ${groupInfo.numbers.join(", ")}` + "\n";
    }
    if (groupInfo.typeLabels && Array.isArray(groupInfo.typeLabels)) {
      result += `ประเภท: ${groupInfo.typeLabels.join(", ")}` + "\n";
    }
    // เพิ่ม field อื่นๆ ตามต้องการ
    return result.trim() || JSON.stringify(groupInfo, null, 2);
  }

  useEffect(() => {
    fetchLogsAndSoftDeleted();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-2 md:px-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ประวัติการลบรายการหวย</CardTitle>
          <CardDescription>รายการหวยที่ถูกลบระหว่างสั่งซื้อยังไม่สำเร็จ</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-4 items-end mb-4"
            onSubmit={e => {
              e.preventDefault();
              fetchLogsAndSoftDeleted();
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">วันที่เริ่มต้น</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ถึงวันที่</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" className="h-10">ค้นหา</Button>
            <Button type="button" variant="outline" className="h-10" onClick={() => { setDateFrom(""); setDateTo(""); fetchLogsAndSoftDeleted(); }}>ล้าง</Button>
          </form>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 border-b">#</th>
                  <th className="px-2 py-1 border-b">วันที่ลบ</th>
                  <th className="px-2 py-1 border-b">ผู้ใช้</th>
                  <th className="px-2 py-1 border-b">บิล</th>
                  <th className="px-2 py-1 border-b">งวด</th>
                  <th className="px-2 py-1 border-b">เวลาปิดรับ</th>
                  <th className="px-2 py-1 border-b">รายละเอียด</th>
                  <th className="px-2 py-1 border-b">เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-400">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 text-center">{idx + 1}</td>
                      <td className="px-2 py-1">{format(new Date(log.removed_at), 'd MMM yyyy HH:mm', { locale: th })}</td>
                      <td className="px-2 py-1">{log.user_id}</td>
                      <td className="px-2 py-1">{log.bill_number}</td>
                      <td className="px-2 py-1">{log.draw_date ? format(new Date(log.draw_date), 'd MMM yyyy', { locale: th }) : '-'}</td>
                      <td className="px-2 py-1">{log.close_time || '-'}</td>
                      <td className="px-2 py-1 max-w-[200px] text-center">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedLog(log); setDrawerOpen(true); }}>
                          ดูรายละเอียด
                        </Button>
                      </td>
                      <td className="px-2 py-1">{log.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>รายการหวยที่ถูกลบ (Soft Delete)</CardTitle>
          <CardDescription>รายการหวยที่ถูกลบสั่งซื้อสำเร็จแล้ว สามารถกู้คืนได้ภายใน 30 วัน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-sm text-yellow-700 bg-yellow-100 rounded px-2 py-1">
            รายการเหล่านี้จะถูกลบถาวรใน 30 วัน สามารถกู้คืนได้
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 border-b">#</th>
                  <th className="px-2 py-1 border-b">วันที่ลบ</th>
                  <th className="px-2 py-1 border-b">ผู้ใช้</th>
                  <th className="px-2 py-1 border-b">บิล</th>
                  <th className="px-2 py-1 border-b">ชื่อบิล</th>
                  <th className="px-2 py-1 border-b">งวด</th>
                  <th className="px-2 py-1 border-b">เวลาปิดรับ</th>
                  <th className="px-2 py-1 border-b text-red-700">เหลืออีก (วัน)</th>
                  <th className="px-2 py-1 border-b">กู้คืน</th>
                </tr>
              </thead>
              <tbody>
                {softDeletedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-400">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  softDeletedTickets.map((ticket, idx) => {
                    const daysPassed = differenceInDays(new Date(), new Date(ticket.deleted_at));
                    const daysLeft = Math.max(0, 30 - daysPassed);
                    return (
                      <tr key={ticket.id} className="border-b hover:bg-green-50 cursor-pointer" onClick={() => { setSelectedBillNumber(ticket.bill_number); setBillDrawerOpen(true); }}>
                        <td className="px-2 py-1 text-center">{idx + 1}</td>
                        <td className="px-2 py-1">{ticket.deleted_at ? format(new Date(ticket.deleted_at), 'd MMM yyyy HH:mm', { locale: th }) : '-'}</td>
                        <td className="px-2 py-1">{ticket.user_id}</td>
                        <td className="px-2 py-1 font-bold text-green-700">{ticket.bill_number}</td>
                        <td className="px-2 py-1">{ticket.draw_date ? format(new Date(ticket.draw_date), 'd MMM yyyy', { locale: th }) : '-'}</td>
                        <td className="px-2 py-1">{ticket.close_time || '-'}</td>
                        <td className="px-2 py-1">{ticket.bill_name || '-'}</td>
                        <td className="px-2 py-1 text-center">
                          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedBillNumber(ticket.bill_number); setBillDrawerOpen(true); }}>ดูรายละเอียด</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <BillDetailDrawer isOpen={billDrawerOpen} onOpenChange={setBillDrawerOpen} billNumber={selectedBillNumber || undefined} />
        </CardContent>
      </Card>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>รายละเอียดรายการ</DrawerTitle>
            <DrawerDescription>
              ข้อมูลรายละเอียด
            </DrawerDescription>
            {selectedLog && (
              <div className="whitespace-pre-wrap text-sm mt-2">
                {formatGroupInfo(selectedLog.group_info)}
              </div>
            )}
            <DrawerClose asChild>
              <Button className="mt-4">ปิด</Button>
            </DrawerClose>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    </div>
  );
} 