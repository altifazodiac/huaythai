"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Phone, 
  Mail, 
  CreditCard, 
  Building, 
  MessageCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Calendar,
  Key,
  Banknote,
  Coins,
  Wallet,
  Settings,
  BarChart3,
  Filter
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  line_id: string | null;
  branch: string | null;
  credit_balance: number;
  created_at: string;
  updated_at: string | null;
  role: string;
}

interface CreateUserForm {
  phone: string;
  password: string;
  email: string;
  name: string;
  line_id: string;
  branch: string;
  credit_balance: number;
  role: string;
}

interface EditUserForm {
  name: string;
  phone: string;
  email: string;
  line_id: string;
  branch: string;
  credit_balance: number;
  role: string;
}

interface SecurityVerification {
  captcha: string;
  otp: string;
  adminPassword: string;
}

export default function UsersManagePage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityVerification, setSecurityVerification] = useState<SecurityVerification>({
    captcha: "",
    otp: "",
    adminPassword: ""
  });
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [transactionStep, setTransactionStep] = useState(1);
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const captchaRef = useRef<HTMLCanvasElement>(null);

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    phone: "",
    password: "",
    email: "",
    name: "",
    line_id: "",
    branch: "",
    credit_balance: 0,
    role: "user"
  });

  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    phone: "",
    email: "",
    line_id: "",
    branch: "",
    credit_balance: 0,
    role: "user"
  });

  const { supabase } = useAuth();
  useRequireAuth();

  // Generate CAPTCHA
  const generateCaptcha = () => {
    const canvas = captchaRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let captcha = '';
    
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
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
    
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    
    setGeneratedCaptcha(captcha);
  };

  // Validation function for Thai phone numbers
  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/[-\s]/g, ''));
  };

  // Format phone number to international format
  const formatPhoneNumber = (phoneInput: string) => {
    let cleanPhone = phoneInput.replace(/[-\s]/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+66' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('66') && !cleanPhone.startsWith('+66')) {
      cleanPhone = '+' + cleanPhone;
    } else if (!cleanPhone.startsWith('+66')) {
      cleanPhone = '+66' + cleanPhone;
    }
    
    return cleanPhone;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map((profile: any) => ({
        ...profile,
        role: roles?.find((role: any) => role.user_id === profile.id)?.role || 'user'
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
    toast.success("รีเฟรชข้อมูลสำเร็จ");
  };

  useEffect(() => {
    fetchUsers();
    generateCaptcha();
  }, []);

  const handleSecurityVerification = async (action: string) => {
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

    // Proceed with action
    setTransactionStep(2);
    
    try {
      if (action === 'create') {
        await handleCreateUserSubmit();
      } else if (action === 'edit') {
        await handleEditUserSubmit();
      } else if (action === 'delete') {
        await handleDeleteUserSubmit();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setShowSecurityDialog(false);
      setSecurityVerification({ captcha: "", otp: "", adminPassword: "" });
      setTransactionStep(1);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(createForm.phone)) {
      toast.error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)");
      return;
    }

    setShowSecurityDialog(true);
    setTransactionStep(1);
  };

  const handleCreateUserSubmit = async () => {
    const formattedPhone = formatPhoneNumber(createForm.phone);
    
    const requestData = {
      ...createForm,
      phone: formattedPhone
    };

    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong');
    }

    toast.success("สร้างผู้ใช้สำเร็จ");
    setShowCreateDialog(false);
    setCreateForm({
      phone: "",
      password: "",
      email: "",
      name: "",
      line_id: "",
      branch: "",
      credit_balance: 0,
      role: "user"
    });
    fetchUsers();
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    if (editForm.phone && !validatePhoneNumber(editForm.phone)) {
      toast.error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)");
      return;
    }

    setShowSecurityDialog(true);
    setTransactionStep(1);
  };

  const handleEditUserSubmit = async () => {
    if (!selectedUser) return;

    const formattedPhone = editForm.phone ? formatPhoneNumber(editForm.phone) : editForm.phone;

    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`/api/admin-users?id=${selectedUser.id}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        action: 'update_user',
        name: editForm.name,
        phone: formattedPhone,
        email: editForm.email,
        line_id: editForm.line_id,
        branch: editForm.branch,
        credit_balance: editForm.credit_balance,
        role: editForm.role
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong');
    }

    toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
    setShowEditDialog(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setShowSecurityDialog(true);
    setTransactionStep(1);
  };

  const handleDeleteUserSubmit = async () => {
    if (!selectedUser) return;

    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`/api/admin-users?id=${selectedUser.id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong');
    }

    toast.success("ลบผู้ใช้สำเร็จ");
    setShowDeleteDialog(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleResetPassword = async (user: UserProfile) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin-users?id=${user.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'reset_password' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      toast.success(`รีเซ็ตรหัสผ่านสำเร็จ รหัสผ่านใหม่: ${result.newPassword}`);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: " + error.message);
    }
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      line_id: user.line_id || "",
      branch: user.branch || "",
      credit_balance: user.credit_balance,
      role: user.role
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = 
        user.phone?.includes(searchTerm) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.branch?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === "all" || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "credit_balance":
          return b.credit_balance - a.credit_balance;
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  // Statistics
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const totalCredit = users.reduce((sum, user) => sum + user.credit_balance, 0);
  const activeUsers = users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            จัดการผู้ใช้ระบบ
          </h1>
          <p className="text-gray-600 mt-1">ระบบจัดการผู้ใช้ด้วยมาตรฐานธนาคารและความปลอดภัยขั้นสูง</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4 mr-2" />
                เพิ่มผู้ใช้ใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  เพิ่มผู้ใช้ใหม่
                </DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลผู้ใช้ใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      เบอร์โทรศัพท์ *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                      placeholder="เช่น 0812345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      รหัสผ่าน *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                        required
                        minLength={6}
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
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      ชื่อ-นามสกุล
                    </Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      อีเมล
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      placeholder="optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line_id" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Line ID
                    </Label>
                    <Input
                      id="line_id"
                      value={createForm.line_id}
                      onChange={(e) => setCreateForm({...createForm, line_id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      สาขา
                    </Label>
                    <Input
                      id="branch"
                      value={createForm.branch}
                      onChange={(e) => setCreateForm({...createForm, branch: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit_balance" className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      เครดิตเริ่มต้น
                    </Label>
                    <Input
                      id="credit_balance"
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.credit_balance}
                      onChange={(e) => setCreateForm({...createForm, credit_balance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      สิทธิ์
                    </Label>
                    <Select value={createForm.role} onValueChange={(value) => setCreateForm({...createForm, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">ผู้ใช้ทั่วไป</SelectItem>
                        <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Shield className="h-4 w-4 mr-2" />
                    สร้างผู้ใช้ (ระบบความปลอดภัย)
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-900">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">ผู้ดูแลระบบ</p>
                <p className="text-2xl font-bold text-green-900">{adminUsers}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">เครดิตรวม</p>
                <p className="text-2xl font-bold text-purple-900">฿{totalCredit.toLocaleString()}</p>
              </div>
              <Banknote className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">ผู้ใช้ใหม่ (30 วัน)</p>
                <p className="text-2xl font-bold text-orange-900">{activeUsers}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาด้วยเบอร์โทร, ชื่อ, อีเมล หรือสาขา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="กรองตามสิทธิ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="user">ผู้ใช้ทั่วไป</SelectItem>
                <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="เรียงลำดับ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">วันที่สร้างล่าสุด</SelectItem>
                <SelectItem value="name">ชื่อ A-Z</SelectItem>
                <SelectItem value="credit_balance">เครดิตมาก-น้อย</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            รายการผู้ใช้ ({filteredAndSortedUsers.length} คน)
          </CardTitle>
          <CardDescription>
            จัดการข้อมูลผู้ใช้ทั้งหมดในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  ไม่พบข้อมูลผู้ใช้
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAndSortedUsers.map((user) => (
                    <Card key={user.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{user.name || "ไม่ระบุชื่อ"}</h3>
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{user.phone || "ไม่ระบุเบอร์"}</span>
                              </div>
                              {user.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{user.email}</span>
                                </div>
                              )}
                              {user.line_id && (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>{user.line_id}</span>
                                </div>
                              )}
                              {user.branch && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-4 w-4" />
                                  <span>{user.branch}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-600">
                                  ฿{user.credit_balance.toLocaleString()}
                                </span>
                              </div>
                              <span className="text-gray-500 flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                สร้างเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              แก้ไข
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetPassword(user)}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              รีเซ็ตรหัสผ่าน
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              ลบ
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              แก้ไขข้อมูลผู้ใช้
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของ {selectedUser?.phone || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  เบอร์โทรศัพท์
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="เช่น 0812345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  ชื่อ-นามสกุล
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  อีเมล
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-line_id" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Line ID
                </Label>
                <Input
                  id="edit-line_id"
                  value={editForm.line_id}
                  onChange={(e) => setEditForm({...editForm, line_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-branch" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  สาขา
                </Label>
                <Input
                  id="edit-branch"
                  value={editForm.branch}
                  onChange={(e) => setEditForm({...editForm, branch: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-credit_balance" className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  เครดิต
                </Label>
                <Input
                  id="edit-credit_balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.credit_balance}
                  onChange={(e) => setEditForm({...editForm, credit_balance: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  สิทธิ์
                </Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({...editForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">ผู้ใช้ทั่วไป</SelectItem>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Shield className="h-4 w-4 mr-2" />
                บันทึก (ระบบความปลอดภัย)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              ยืนยันการลบผู้ใช้
            </DialogTitle>
            <DialogDescription>
              คุณต้องการลบผู้ใช้ <strong>{selectedUser?.phone || selectedUser?.email}</strong> ใช่หรือไม่?
              <br />
              <span className="text-red-600 font-medium">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Shield className="h-4 w-4 mr-2" />
              ลบผู้ใช้ (ระบบความปลอดภัย)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Verification Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              ระบบความปลอดภัยขั้นสูง
            </DialogTitle>
            <DialogDescription>
              กรุณายืนยันตัวตนเพื่อดำเนินการ
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium">กำลังดำเนินการ...</p>
              <p className="text-sm text-gray-600">กรุณารอสักครู่</p>
            </div>
          )}

          <DialogFooter>
            {transactionStep === 1 && (
              <>
                <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={() => {
                  if (showCreateDialog) handleSecurityVerification('create');
                  else if (showEditDialog) handleSecurityVerification('edit');
                  else if (showDeleteDialog) handleSecurityVerification('delete');
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ยืนยันการดำเนินการ
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
