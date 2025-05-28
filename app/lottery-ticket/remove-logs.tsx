"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default function RemoveLogsPage() {
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [logs, setLogs] = useState<RemoveLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  function renderGroupInfo(group: any) {
    if (!group) return null;
    return (
      <div className="text-xs">
        <div>จำนวนหลัก: <b>{group.digit_number}</b></div>
        <div>เลข: <b>{group.numbers?.join(", ")}</b></div>
        <div>ประเภท: <b>{group.typeLabels?.join(", ")}</b></div>
        <div>จำนวนเงิน:</div>
        <ul className="ml-4 list-disc">
          {group.typeLabels?.map((label: string) => (
            <li key={label}>
              {label}: {group.amounts?.[label] ?? 0} บาท
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-2 md:px-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ประวัติการลบรายการหวย</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-4 items-end mb-4"
            onSubmit={e => {
              e.preventDefault();
              fetchLogs();
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
            <Button type="button" variant="outline" className="h-10" onClick={() => { setDateFrom(""); setDateTo(""); fetchLogs(); }}>ล้าง</Button>
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
                      <td className="px-2 py-1 max-w-[200px] overflow-x-auto">
                        {renderGroupInfo(log.group_info)}
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
    </div>
  );
} 