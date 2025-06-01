// app/admin/credit-topup/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  credit_balance: number;
};

export default function AdminCreditTopupPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // โหลดรายชื่อ user
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email, credit_balance");
      if (error) toast.error("โหลดรายชื่อผู้ใช้ผิดพลาด");
      else setUsers(data as User[]);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    // โหลดประวัติการเติมเครดิตเดือนล่าสุด
    const fetchHistory = async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, user_id, amount, created_at, profiles: user_id (name, email)")
        .eq("transaction_type", "topup")
        .gte("created_at", firstDay.toISOString())
        .lte("created_at", lastDay.toISOString())
        .order("created_at", { ascending: false });
      if (!error) setHistory(data || []);
    };
    fetchHistory();
  }, []);

  // ฟิลเตอร์ข้อมูล
  const filteredHistory = history.filter((item) => {
    const user = item.profiles;
    const searchLower = search.toLowerCase();
    return (
      (!search ||
        (user?.name && user.name.toLowerCase().includes(searchLower)) ||
        (user?.email && user.email.toLowerCase().includes(searchLower)) ||
        (item.amount && item.amount.toString().includes(searchLower)) ||
        (item.created_at && format(new Date(item.created_at), "dd/MM/yyyy HH:mm").includes(searchLower))
      )
    );
  });

  const handleTopup = async () => {
    setLoading(true);
    // 1. เพิ่ม transaction
    const { error: txError } = await supabase.from("credit_transactions").insert([
      {
        user_id: selectedUser,
        amount: Number(amount),
        transaction_type: "topup",
      },
    ]);
    if (txError) {
      toast.error("เติมเครดิตไม่สำเร็จ: " + txError.message);
      setLoading(false);
      return;
    }
    // 2. อัปเดต credit_balance
    const user = users.find(u => u.id === selectedUser);
    const newBalance = (user?.credit_balance || 0) + Number(amount);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credit_balance: newBalance })
      .eq("id", selectedUser);
    if (updateError) toast.error("อัปเดตเครดิตไม่สำเร็จ: " + updateError.message);
    else toast.success("เติมเครดิตสำเร็จ!");
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">เติมเครดิตให้ผู้ใช้</h1>
      <div className="mb-4">
        <label>เลือกผู้ใช้:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
        >
          <option value="">-- เลือก --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name || u.email} (เครดิต: {u.credit_balance})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label>จำนวนเครดิต:</label>
        <input
          type="number"
          className="border p-2 rounded w-full"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min={1}
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        onClick={handleTopup}
        disabled={loading || !selectedUser || !amount}
      >
        {loading ? "กำลังเติม..." : "เติมเครดิต"}
      </button>
      <div className="mb-8 mt-12">
        <h2 className="text-xl font-semibold mb-2">ประวัติการเติมเครดิตเดือนนี้</h2>
        <Input
          placeholder="ค้นหาด้วยชื่อ, อีเมล, จำนวน, วันที่..."
          className="mb-3"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>ชื่อผู้ใช้</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: th })}</TableCell>
                  <TableCell>{item.profiles?.name || '-'}</TableCell>
                  <TableCell>{item.profiles?.email || '-'}</TableCell>
                  <TableCell className="text-right">{Number(item.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableCaption>แสดงเฉพาะรายการเติมเครดิตของเดือนนี้</TableCaption>
        </Table>
      </div>
    </div>
  );
}