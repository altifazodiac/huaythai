"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Loader2, MonitorSmartphone, Globe, Clock } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      // ดึง user ปัจจุบัน
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // ดึง login history ของ user นี้
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", user.id)
        .order("login_at", { ascending: false })
        .limit(20);
      if (!error && data) setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-red-800">ประวัติการเข้าสู่ระบบ</h1>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-red-700">
          <Loader2 className="animate-spin mr-2" /> กำลังโหลด...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center text-gray-500 py-10">ไม่พบประวัติการเข้าสู่ระบบ</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-lg bg-white/80">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-red-700 to-lime-400 text-white">
                <th className="py-3 px-4 text-left">วันเวลา</th>
                <th className="py-3 px-4 text-left">IP Address</th>
                <th className="py-3 px-4 text-left">อุปกรณ์</th>
                <th className="py-3 px-4 text-left">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={item.id} className={idx === 0 ? "bg-lime-100 font-bold" : "hover:bg-red-50"}>
                  <td className="py-2 px-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-700" />
                    {format(new Date(item.login_at), "dd MMM yyyy HH:mm", { locale: th })}
                  </td>
                  <td className="py-2 px-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-red-700" />
                    {item.ip_address || "-"}
                  </td>
                  <td className="py-2 px-4 flex items-center gap-2">
                    <MonitorSmartphone className="w-4 h-4 text-red-700" />
                    <span className="truncate max-w-[120px]">{item.user_agent?.slice(0, 40) || "-"}</span>
                  </td>
                  <td className="py-2 px-4">
                    {idx === 0 ? (
                      <span className="inline-block px-2 py-1 bg-lime-400 text-red-900 rounded-full text-xs animate-pulse">ล่าสุด</span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">ปกติ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}