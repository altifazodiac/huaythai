// app/admin/credit-topup/page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { 
  CreditCard, 
  User, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  History,
  Search,
  RefreshCw,
  Zap,
  Banknote,
  Coins,
  Wallet
} from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  credit_balance: number;
  role: string;
};

interface SecurityVerification {
  captcha: string;
  otp: string;
  adminPassword: string;
}

export default function AdminCreditTopupPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityVerification, setSecurityVerification] = useState<SecurityVerification>({
    captcha: "",
    otp: "",
    adminPassword: ""
  });
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionStep, setTransactionStep] = useState(1);
  const captchaRef = useRef<HTMLCanvasElement>(null);

  // Generate CAPTCHA
  const generateCaptcha = () => {
    const canvas = captchaRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let captcha = '';
    
    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate random captcha
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Draw captcha text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < captcha.length; i++) {
      const x = 30 + i * 25;
      const y = 25 + Math.random() * 10;
      const rotation = (Math.random() - 0.5) * 0.4;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillText(captcha[i], 0, 0);
      ctx.restore();
    }
    
    // Add noise
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    
    setGeneratedCaptcha(captcha);
  };

  useEffect(() => {
    fetchUsers();
    fetchHistory();
    generateCaptcha();
  }, []);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, credit_balance")
        .order("name", { ascending: true });
      
      if (error) {
        toast.error("โหลดรายชื่อผู้ใช้ผิดพลาด");
        return;
      }

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (!rolesError && roles) {
        const usersWithRoles = data?.map((user: any) => ({
          ...user,
          role: roles.find((role: any) => role.user_id === user.id)?.role || 'user'
        })) || [];
        setUsers(usersWithRoles);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setRefreshing(false);
    }
  };

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

  const filteredHistory = history.filter((item) => {
    const user = item.profiles;
    const searchLower = search.toLowerCase();
    return (
      (!search ||
        (user?.name && user.name.toLowerCase().includes(searchLower)) ||
        (user?.email && user.email.toLowerCase().includes(searchLower)) ||
        (user?.phone && user.phone.toLowerCase().includes(searchLower)) ||
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

    setShowSecurityDialog(true);
    setTransactionStep(1);
  };

  const handleSecurityVerification = async () => {
    // Validate CAPTCHA
    if (securityVerification.captcha.toUpperCase() !== generatedCaptcha) {
      toast.error("รหัส CAPTCHA ไม่ถูกต้อง");
      generateCaptcha();
      setSecurityVerification(prev => ({ ...prev, captcha: "" }));
      return;
    }

    // Validate OTP (simulate)
    if (securityVerification.otp !== "123456") {
      toast.error("รหัส OTP ไม่ถูกต้อง (ใช้ 123456 สำหรับทดสอบ)");
      return;
    }

    // Validate admin password (simulate)
    if (securityVerification.adminPassword !== "admin123") {
      toast.error("รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (ใช้ admin123 สำหรับทดสอบ)");
      return;
    }

    // Proceed with transaction
    setTransactionStep(2);
    setLoading(true);

    try {
      const user = users.find(u => u.id === selectedUser);
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // 1. เพิ่ม transaction
      const { error: txError } = await supabase.from("credit_transactions").insert([
        {
          user_id: selectedUser,
          amount: Number(amount),
          transaction_type: "topup",
        },
      ]);

      if (txError) throw new Error("เติมเครดิตไม่สำเร็จ: " + txError.message);

      // 2. อัปเดต credit_balance
      const newBalance = (user?.credit_balance || 0) + Number(amount);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credit_balance: newBalance })
        .eq("id", selectedUser);

      if (updateError) throw new Error("อัปเดตเครดิตไม่สำเร็จ: " + updateError.message);

      toast.success(`เติมเครดิตสำเร็จ! ยอดใหม่: ฿${newBalance.toLocaleString()}`);
      
      // Reset form
      setSelectedUser("");
      setAmount("");
      setShowSecurityDialog(false);
      setSecurityVerification({ captcha: "", otp: "", adminPassword: "" });
      setTransactionStep(1);
      
      // Refresh data
      fetchUsers();
      fetchHistory();
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="h-8 w-8 text-green-600" />
            ระบบเติมเครดิต
          </h1>
          <p className="text-gray-600 mt-1">จัดการเครดิตผู้ใช้ด้วยระบบความปลอดภัยขั้นสูง</p>
        </div>
        <Button
          onClick={fetchUsers}
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรชข้อมูล
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Topup Form */}
        <div className="lg:col-span-1">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                เติมเครดิต
              </CardTitle>
              <CardDescription>
                เลือกผู้ใช้และระบุจำนวนเครดิตที่ต้องการเติม
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  เลือกผู้ใช้
                </Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- เลือกผู้ใช้ --" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{u.name || u.email || u.phone}</span>
                          <Badge variant="outline" className="ml-2">
                            ฿{u.credit_balance.toLocaleString()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUserData && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">{selectedUserData.name || "ไม่ระบุชื่อ"}</p>
                        <p className="text-sm text-blue-700">{selectedUserData.email || selectedUserData.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600">เครดิตปัจจุบัน</p>
                        <p className="text-xl font-bold text-blue-900">฿{selectedUserData.credit_balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  จำนวนเครดิต
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    className="pl-10"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min={1}
                    placeholder="0"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleTopup}
                disabled={!selectedUser || !amount || Number(amount) <= 0}
              >
                <Shield className="h-4 w-4 mr-2" />
                เติมเครดิต (ระบบความปลอดภัย)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                ประวัติการเติมเครดิตเดือนนี้
              </CardTitle>
              <CardDescription>
                แสดงรายการเติมเครดิตทั้งหมดในเดือนปัจจุบัน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ค้นหาด้วยชื่อ, อีเมล, เบอร์โทร, จำนวน, วันที่..."
                  className="pl-10"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              
              <div className="rounded-lg border">
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
                          <div className="flex flex-col items-center gap-2">
                            <History className="h-8 w-8 text-gray-300" />
                            ไม่พบข้อมูลการเติมเครดิต
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.profiles?.name || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {item.profiles?.email || item.profiles?.phone || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              +฿{Number(item.amount).toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableCaption>แสดงเฉพาะรายการเติมเครดิตของเดือนนี้</TableCaption>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Verification Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              ระบบความปลอดภัยขั้นสูง
            </DialogTitle>
            <DialogDescription>
              กรุณายืนยันตัวตนเพื่อดำเนินการเติมเครดิต
            </DialogDescription>
          </DialogHeader>

          {transactionStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>รหัส CAPTCHA</Label>
                <div className="flex items-center gap-2">
                  <canvas
                    ref={captchaRef}
                    width="180"
                    height="50"
                    className="border rounded cursor-pointer"
                    onClick={generateCaptcha}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateCaptcha}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="กรอกรหัส CAPTCHA"
                  value={securityVerification.captcha}
                  onChange={(e) => setSecurityVerification(prev => ({ ...prev, captcha: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>รหัส OTP (ใช้ 123456 สำหรับทดสอบ)</Label>
                <Input
                  type="text"
                  placeholder="กรอกรหัส OTP"
                  value={securityVerification.otp}
                  onChange={(e) => setSecurityVerification(prev => ({ ...prev, otp: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>รหัสผ่านผู้ดูแลระบบ (ใช้ admin123 สำหรับทดสอบ)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่าน"
                    value={securityVerification.adminPassword}
                    onChange={(e) => setSecurityVerification(prev => ({ ...prev, adminPassword: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">หมายเหตุสำหรับการทดสอบ</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  OTP: 123456 | รหัสผ่าน: admin123
                </p>
              </div>
            </div>
          )}

          {transactionStep === 2 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium">กำลังดำเนินการเติมเครดิต...</p>
              <p className="text-sm text-gray-600">กรุณารอสักครู่</p>
            </div>
          )}

          <DialogFooter>
            {transactionStep === 1 && (
              <>
                <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSecurityVerification}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ยืนยันการเติมเครดิต
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}