"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Search, TrendingUp, TrendingDown, Plus, Minus, CreditCard, History } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  created_at: string;
  description: string | null;
  related_bill_number: string | null;
  user_email?: string;
  user_name?: string;
}

interface TransactionStats {
  total_transactions: number;
  total_topups: number;
  total_purchases: number;
  total_admin_adjustments: number;
  total_amount_in: number;
  total_amount_out: number;
}

export default function CreditHistoryPage() {
  useRequireAuth();
  const { user, supabase } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions with user details
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          profiles!credit_transactions_user_id_fkey (
            email,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (transactionsError) throw transactionsError;

      // Transform data to include user details
      const transformedTransactions = transactionsData?.map((transaction: any) => ({
        ...transaction,
        user_email: transaction.profiles?.email,
        user_name: transaction.profiles?.name
      })) || [];

      setTransactions(transformedTransactions);

      // Calculate statistics
      const stats: TransactionStats = {
        total_transactions: transformedTransactions.length,
        total_topups: transformedTransactions.filter(t => 
          ['topup', 'initial_credit', 'admin_topup'].includes(t.transaction_type)
        ).length,
        total_purchases: transformedTransactions.filter(t => t.transaction_type === 'purchase').length,
        total_admin_adjustments: transformedTransactions.filter(t => 
          ['admin_topup', 'admin_deduction', 'initial_credit'].includes(t.transaction_type)
        ).length,
        total_amount_in: transformedTransactions
          .filter(t => ['topup', 'initial_credit', 'admin_topup'].includes(t.transaction_type))
          .reduce((sum, t) => sum + Number(t.amount), 0),
        total_amount_out: transformedTransactions
          .filter(t => ['purchase', 'admin_deduction'].includes(t.transaction_type))
          .reduce((sum, t) => sum + Number(t.amount), 0)
      };

      setStats(stats);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleData?.role === 'admin') {
          fetchTransactions();
        }
      }
    };
    
    checkAdminAndFetch();
  }, [user, supabase]);

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'topup':
        return { label: 'เติมเครดิต', color: 'bg-green-100 text-green-800', icon: Plus };
      case 'initial_credit':
        return { label: 'เครดิตเริ่มต้น', color: 'bg-blue-100 text-blue-800', icon: CreditCard };
      case 'admin_topup':
        return { label: 'Admin เติม', color: 'bg-emerald-100 text-emerald-800', icon: TrendingUp };
      case 'admin_deduction':
        return { label: 'Admin หัก', color: 'bg-red-100 text-red-800', icon: TrendingDown };
      case 'purchase':
        return { label: 'ซื้อหวย', color: 'bg-orange-100 text-orange-800', icon: Minus };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-800', icon: History };
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.related_bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || transaction.transaction_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (!user) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ประวัติการทำธุรกรรมเครดิต</h1>
          <p className="text-muted-foreground">ตรวจสอบประวัติการเติมและใช้เครดิตของผู้ใช้ทั้งหมด</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ธุรกรรมทั้งหมด</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">การเติมเครดิต</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.total_topups.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ยอดรวม {stats.total_amount_in.toLocaleString()} บาท
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">การซื้อหวย</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.total_purchases.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ยอดรวม {stats.total_amount_out.toLocaleString()} บาท
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">การปรับโดย Admin</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total_admin_adjustments.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ค้นหาและกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยอีเมล, ชื่อ, หรือรายละเอียด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="ประเภทธุรกรรม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="topup">เติมเครดิต</SelectItem>
                <SelectItem value="initial_credit">เครดิตเริ่มต้น</SelectItem>
                <SelectItem value="admin_topup">Admin เติม</SelectItem>
                <SelectItem value="admin_deduction">Admin หัก</SelectItem>
                <SelectItem value="purchase">ซื้อหวย</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการธุรกรรม</CardTitle>
          <CardDescription>
            แสดง {filteredTransactions.length} รายการจากทั้งหมด {transactions.length} รายการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลธุรกรรม</div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => {
                const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                const Icon = typeInfo.icon;
                const isIncome = ['topup', 'initial_credit', 'admin_topup'].includes(transaction.transaction_type);
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${typeInfo.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {transaction.user_name || transaction.user_email}
                          </span>
                          <Badge variant="outline" className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.description || 'ไม่มีรายละเอียด'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}{Number(transaction.amount).toLocaleString()} บาท
                      </div>
                      {transaction.related_bill_number && (
                        <div className="text-xs text-muted-foreground">
                          บิล: {transaction.related_bill_number}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
