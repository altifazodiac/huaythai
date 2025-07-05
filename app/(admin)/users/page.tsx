"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

interface UserRow {
  id: string;
  email: string;
  role: string;
}

export default function AdminUserPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("user");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();

  useRequireAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin-users");
        const usersData = await res.json();
        if (usersData.error) throw new Error(usersData.error);
        // ดึง roles
        const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
        if (rolesError) throw rolesError;
        // join ข้อมูล
        const userRows: UserRow[] = usersData.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: rolesData.find((r: any) => r.user_id === u.id)?.role || "user",
        }));
        setUsers(userRows);
        console.log("usersData", usersData);
        console.log("rolesData", rolesData);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [refresh]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: newRole });
    if (error) {
      toast.error("เปลี่ยนสิทธิ์ไม่สำเร็จ: " + error.message);
    } else {
      toast.success("เปลี่ยนสิทธิ์สำเร็จ");
      setRefresh(r => r + 1);
    }
  };

  const handleDelete = async (userId: string) => {
    setConfirmDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", confirmDelete);
    if (error) {
      toast.error("ลบสิทธิ์ไม่สำเร็จ: " + error.message);
    } else {
      toast.success("ลบสิทธิ์สำเร็จ");
      setRefresh(r => r + 1);
    }
    setConfirmDelete(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail) return;
    // หา user id จาก email ผ่าน API route
    const res = await fetch(`/api/admin-users`);
    const usersData = await res.json();
    const foundUser = usersData.find((u: any) => u.email === addEmail);
    if (!foundUser) {
      toast.error("ไม่พบ email นี้ในระบบ");
      return;
    }
    // เพิ่มหรืออัปเดต role
    const { error } = await supabase.from("user_roles").upsert({ user_id: foundUser.id, role: addRole });
    if (error) {
      toast.error("เพิ่ม/อัปเดตสิทธิ์ไม่สำเร็จ: " + error.message);
    } else {
      toast.success("เพิ่ม/อัปเดตสิทธิ์สำเร็จ");
      setRefresh(r => r + 1);
      setAddEmail("");
      setAddRole("user");
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">จัดการผู้ใช้ (Admin)</h1>
      <form onSubmit={handleAddUser} className="flex gap-2 mb-4">
        <input
          type="email"
          placeholder="เพิ่มผู้ใช้ด้วย email..."
          value={addEmail}
          onChange={e => setAddEmail(e.target.value)}
          className="border p-2 rounded w-64"
          required
        />
        <select value={addRole} onChange={e => setAddRole(e.target.value)} className="border p-2 rounded">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit">เพิ่ม/อัปเดตสิทธิ์</Button>
      </form>
      <input
        type="text"
        placeholder="ค้นหา email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border p-2 rounded mb-2 w-full"
      />
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <table className="w-full border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td className="p-2 border">{user.email}</td>
              <td className="p-2 border">{user.role}</td>
              <td className="p-2 border space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleChangeRole(user.id, user.role === "admin" ? "user" : "admin")}>{user.role === "admin" ? "Set User" : "Set Admin"}</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (window.confirm("ต้องการลบ User นี้ถาวร?")) {
                      const res = await fetch('/api/admin-users', {
                        method: 'DELETE',
                        body: JSON.stringify({ userId: user.id }),
                        headers: { 'Content-Type': 'application/json' },
                      });
                      const result = await res.json();
                      if (result.error) {
                        toast.error("ลบ User ไม่สำเร็จ: " + result.error);
                      } else {
                        toast.success("ลบ User สำเร็จ");
                        setRefresh(r => r + 1);
                      }
                    }
                  }}
                >
                  ลบ User
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <div className="mb-4">คุณต้องการลบสิทธิ์ผู้ใช้นี้จริงหรือไม่?</div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>ยกเลิก</Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>ยืนยันลบ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 