"use client";

import { useEffect, useState } from "react";
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
import { EnhancedUserDropdown } from "@/components/ui/enhanced-user-dropdown";
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
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Filter,
  Download,
  Upload
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  line_id: string | null;
  branch: string | null;
  credit_balance: number | null;
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
  credit_balance: number | null;
  role: string;
}

interface EditUserForm {
  name: string;
  phone: string;
  email: string;
  line_id: string;
  branch: string;
  credit_balance: number | null;
  role: string;
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
  const [selectedUserForAction, setSelectedUserForAction] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");

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
      
      // Fetch profiles with user roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
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
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    if (!validatePhoneNumber(createForm.phone)) {
      toast.error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)");
      return;
    }

    try {
      const formattedPhone = formatPhoneNumber(createForm.phone);
      
      const requestData = {
        ...createForm,
        phone: formattedPhone
      };

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if session exists
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
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการสร้างผู้ใช้: " + error.message);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    // Validate phone number if it's changed
    if (editForm.phone && !validatePhoneNumber(editForm.phone)) {
      toast.error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)");
      return;
    }

    try {
      const formattedPhone = editForm.phone ? formatPhoneNumber(editForm.phone) : editForm.phone;

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if session exists
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
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้: " + error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if session exists
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
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการลบผู้ใช้: " + error.message);
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if session exists
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

  const filteredUsers = users
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
          return (b.credit_balance ?? 0) - (a.credit_balance ?? 0);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  return (
    <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              จัดการผู้ใช้
            </h1>
            <p className="text-gray-600 mt-1">สร้าง แก้ไข และจัดการผู้ใช้ในระบบด้วยระบบความปลอดภัย</p>
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
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  เพิ่มผู้ใช้ใหม่
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลผู้ใช้ใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
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
                    <Label htmlFor="password">รหัสผ่าน *</Label>
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
                    <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      placeholder="optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line_id">Line ID</Label>
                    <Input
                      id="line_id"
                      value={createForm.line_id}
                      onChange={(e) => setCreateForm({...createForm, line_id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">สาขา</Label>
                    <Input
                      id="branch"
                      value={createForm.branch}
                      onChange={(e) => setCreateForm({...createForm, branch: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit_balance">เครดิต</Label>
                    <Input
                      id="credit_balance"
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.credit_balance !== null && createForm.credit_balance !== undefined ? String(createForm.credit_balance) : ""}
                      onChange={(e) => setCreateForm({...createForm, credit_balance: e.target.value === "" ? null : parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">สิทธิ์</Label>
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
                  <Button type="submit">
                    สร้างผู้ใช้
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <p className="text-sm text-gray-600">ผู้ใช้ทั่วไป</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'user').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">ผู้ดูแลระบบ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
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
                  <p className="text-sm text-gray-600">เครดิตรวม</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ฿{users.reduce((sum, user) => sum + (user.credit_balance ?? 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              ตัวกรองและค้นหา
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <SelectItem value="credit_balance">เครดิตสูงสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ส่งออกข้อมูล
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                นำเข้าข้อมูล
              </Button>
            </div>
          </CardContent>
        </Card>

              {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              รายการผู้ใช้ ({filteredUsers.length} คน)
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
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลผู้ใช้
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{user.name || "ไม่ระบุชื่อ"}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    สร้างเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <Phone className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{user.phone || "ไม่ระบุเบอร์"}</span>
                              </div>
                              {user.email && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                  <Mail className="h-4 w-4 text-gray-600" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                              )}
                              {user.line_id && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                  <span>{user.line_id}</span>
                                </div>
                              )}
                              {user.branch && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                  <Building className="h-4 w-4 text-purple-600" />
                                  <span>{user.branch}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                <CreditCard className="h-5 w-5 text-green-600" />
                                <span className="font-bold text-green-700 text-lg">
                                  ฿{(user.credit_balance ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                              className="hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              แก้ไข
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetPassword(user)}
                              className="hover:bg-yellow-50 hover:border-yellow-300"
                            >
                              รีเซ็ตรหัสผ่าน
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(user)}
                              className="hover:bg-red-50"
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
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของ {selectedUser?.phone || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="เช่น 0812345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">อีเมล</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-line_id">Line ID</Label>
                <Input
                  id="edit-line_id"
                  value={editForm.line_id}
                  onChange={(e) => setEditForm({...editForm, line_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-branch">สาขา</Label>
                <Input
                  id="edit-branch"
                  value={editForm.branch}
                  onChange={(e) => setEditForm({...editForm, branch: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-credit_balance">เครดิต</Label>
                <Input
                  id="edit-credit_balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.credit_balance !== null && editForm.credit_balance !== undefined ? String(editForm.credit_balance) : ""}
                  onChange={(e) => setEditForm({...editForm, credit_balance: e.target.value === "" ? null : parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">สิทธิ์</Label>
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
              <Button type="submit">
                บันทึกการเปลี่ยนแปลง
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบผู้ใช้</DialogTitle>
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
              ลบผู้ใช้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
