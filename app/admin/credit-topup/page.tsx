// app/admin/credit-topup/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

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

  useEffect(() => {
    // โหลดรายชื่อ user
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email, credit_balance");
      if (error) toast.error("โหลดรายชื่อผู้ใช้ผิดพลาด");
      else setUsers(data as User[]);
    };
    fetchUsers();
  }, []);

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
    </div>
  );
}