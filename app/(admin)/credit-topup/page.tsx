// app/admin/credit-topup/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { EnhancedUserDropdown } from "@/components/ui/enhanced-user-dropdown";
import { CreditBalanceDisplay } from "@/components/ui/credit-balance-display";
import { 
  CreditCard, 
  Plus, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Clock,
  Search
} from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  credit_balance: number | null;
  role?: string;
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
      const { data, error } = await supabase.from("profiles").select("id, name, email, phone, credit_balance");
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
        .select("id, user_id, amount, created_at, profiles: user_id (name, email, phone)")
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
        (user?.phone && user.phone.includes(search)) ||
        (item.amount && item.amount.toString().includes(searchLower)) ||
        (item.created_at && format(new Date(item.created_at), "dd/MM/yyyy HH:mm").includes(searchLower))
      )
    );
  });

  const handleTopup = async () => {
    if (!selectedUser || !amount || Number(amount) <= 0) {
      toast.error("กรุณาเลือกผู้ใช้และระบุจำนวนเครดิตที่ถูกต้อง");
      return;
    }

    setLoading(true);
    
    // 1. เพิ่ม transaction
    const { error: txError } = await supabase.from("credit_transactions").insert([
      {
        user_id: selectedUser,
        amount: Number(amount),
        transaction_type: "topup",
      },
    ]);
    console.log("Insert transaction error:", txError);

    if (txError) {
      toast.error("เติมเครดิตไม่สำเร็จ: " + txError.message);
      setLoading(false);
      return;
    }
    
    // 2. อัปเดต credit_balance (ใช้ RPC เพื่อความ atomic และรับค่าใหม่กลับมา)
    const { data: newBalance, error: updateError } = await supabase.rpc('increment_credit_balance', {
      p_user_id: selectedUser,
      p_amount: Number(amount)
    });
    console.log("RPC result:", newBalance, "RPC error:", updateError);
      
    if (updateError) {
      toast.error("อัปเดตเครดิตไม่สำเร็จ: " + updateError.message);
    } else {
      const updatedUser = users.find(u => u.id === selectedUser);
      toast.success("เติมเครดิตสำเร็จ!", {
        description: `เพิ่มเครดิต ฿${Number(amount).toLocaleString()} ให้ ${updatedUser?.name || updatedUser?.email}. ยอดคงเหลือใหม่ ฿${(newBalance ?? 0).toLocaleString()}`,
        duration: 5000
      });
      
      // อัปเดต state ของ user ทันทีด้วยค่าที่ได้จาก RPC
      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === selectedUser 
            ? { ...user, credit_balance: newBalance as number } 
            : user
        )
      );
      
      // Refresh history
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const { data: newHistory } = await supabase
        .from("credit_transactions")
        .select("id, user_id, amount, created_at, profiles: user_id (name, email, phone)")
        .eq("transaction_type", "topup")
        .gte("created_at", firstDay.toISOString())
        .lte("created_at", lastDay.toISOString())
        .order("created_at", { ascending: false });
      if (newHistory) setHistory(newHistory);
    }
    
    setLoading(false);
    setAmount("");
  };

  const selectedUserData = users.find(u => u.id === selectedUser);
  const totalTopupThisMonth = history.reduce((sum, item) => sum + Number(item.amount), 0);
  const averageTopup = history.length > 0 ? totalTopupThisMonth / history.length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          ระบบเติมเครดิต
        </h1>
        <p className="text-gray-600">จัดการเครดิตผู้ใช้ด้วยระบบความปลอดภัย</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ยอดเติมเดือนนี้</p>
                <p className="text-2xl font-bold text-gray-900">฿{totalTopupThisMonth.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">เฉลี่ยต่อรายการ</p>
                <p className="text-2xl font-bold text-gray-900">฿{averageTopup.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topup Form */}
      <Card className="border-2 border-blue-100 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            เติมเครดิตให้ผู้ใช้
          </CardTitle>
          <CardDescription>
            เลือกผู้ใช้และระบุจำนวนเครดิตที่ต้องการเติม
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกผู้ใช้
              </label>
              <EnhancedUserDropdown
                users={users}
                selectedUser={selectedUser}
                onUserSelect={setSelectedUser}
                placeholder="เลือกผู้ใช้ที่ต้องการเติมเครดิต"
                showBalance={true}
                securityLevel="basic"
              />
            </div>

            {selectedUserData && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">
                        {selectedUserData.name || selectedUserData.email || selectedUserData.phone}
                      </h4>
                      <p className="text-sm text-blue-700">
                        เลือกผู้ใช้แล้ว
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                
                <CreditBalanceDisplay
                  balance={selectedUserData.credit_balance ?? 0}
                  size="md"
                  variant="default"
                  animated={false}
                  showDetails={true}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนเครดิต
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="ระบุจำนวนเครดิต"
                  min={1}
                  className="pl-10 text-lg"
                />
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
                              {amount && (
                  <p className="text-sm text-gray-600 mt-1">
                    หลังเติมเครดิต: ฿{((selectedUserData?.credit_balance ?? 0) + Number(amount)).toLocaleString()}
                  </p>
                )}
            </div>

            <Button
              className="w-full h-12 text-lg font-medium"
              onClick={handleTopup}
              disabled={loading || !selectedUser || !amount || Number(amount) <= 0}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังเติมเครดิต...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  เติมเครดิต
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            ประวัติการเติมเครดิตเดือนนี้
          </CardTitle>
          <CardDescription>
            แสดงรายการเติมเครดิตทั้งหมดในเดือนปัจจุบัน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาด้วยชื่อ, อีเมล, เบอร์โทร, จำนวน, วันที่..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ชื่อผู้ใช้</TableHead>
                <TableHead>ข้อมูลติดต่อ</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {item.profiles?.name || 'ไม่ระบุชื่อ'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {item.profiles?.email || item.profiles?.phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        +฿{Number(item.amount).toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption>
              แสดงเฉพาะรายการเติมเครดิตของเดือนนี้ ({filteredHistory.length} รายการ)
            </TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}