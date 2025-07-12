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
  RefreshCw
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

      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      // Check if credit balance changed
      const creditChanged = selectedUser.credit_balance !== editForm.credit_balance;
      const creditDifference = editForm.credit_balance - selectedUser.credit_balance;

      const formattedPhone = editForm.phone ? formatPhoneNumber(editForm.phone) : editForm.phone;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone: formattedPhone,
          email: editForm.email,
          line_id: editForm.line_id,
          branch: editForm.branch,
          credit_balance: editForm.credit_balance
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Log credit adjustment if credit changed
      if (creditChanged && creditDifference !== 0) {
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: selectedUser.id,
            amount: Math.abs(creditDifference),
            transaction_type: creditDifference > 0 ? 'admin_topup' : 'admin_deduction',
            description: creditDifference > 0 
              ? `Admin เติมเครดิต ${Math.abs(creditDifference).toLocaleString()} บาท`
              : `Admin หักเครดิต ${Math.abs(creditDifference).toLocaleString()} บาท`
          });

        if (transactionError) {
          console.warn("Warning: Could not log credit adjustment transaction:", transactionError.message);
          // Continue anyway as profile is updated successfully
        }
      }

      // Update user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: editForm.role
        });

      if (roleError) throw roleError;

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
      // Delete user role first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Delete from auth (admin function)
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.id);
      
      if (authError) {
        console.warn("Warning: Could not delete from auth:", authError.message);
        // Continue anyway as profile is deleted
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
      const newPassword = Math.random().toString(36).slice(-8);
      
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) throw error;

      toast.success(`รีเซ็ตรหัสผ่านสำเร็จ รหัสผ่านใหม่: ${newPassword}`);
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

  const filteredUsers = users.filter(user =>
    user.phone?.includes(searchTerm) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="text-gray-600 mt-1">สร้าง แก้ไข และจัดการผู้ใช้ในระบบ</p>
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
                      value={createForm.credit_balance}
                      onChange={(e) => setCreateForm({...createForm, credit_balance: parseFloat(e.target.value) || 0})}
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="ค้นหาด้วยเบอร์โทร, ชื่อ, อีเมล หรือสาขา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการผู้ใช้ ({filteredUsers.length} คน)</CardTitle>
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
                    <Card key={user.id} className="border-l-4 border-l-blue-500">
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
                              <span className="text-gray-500">
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
                  value={editForm.credit_balance}
                  onChange={(e) => setEditForm({...editForm, credit_balance: parseFloat(e.target.value) || 0})}
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
