// app/credit/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Transaction {
    id: string;
    amount: number;
    transaction_type: string;
    created_at: string;
    description?: string;
    user_id?: string; // Add this if it exists in your table
    user_name?: string; // Add this if it exists in your table
  }
  
export default function CreditPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch user data, balance, transactions, and set up real-time subscription
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Fetch user balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching balance:', balanceError);
        setError('ไม่สามารถโหลดยอดคงเหลือได้');
        return;
      }
      setBalance(balanceData && typeof balanceData.balance === 'number' ? balanceData.balance : 0);

      // Fetch transaction history
      const { data: transactionData, error: transactionError } = await supabase
  .from('credit_history')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .returns<Transaction[]>(); // Add proper typing here

// Update the state setting with proper typing
setTransactions(transactionData || []);

      // Set up real-time subscription for credit_history
      const subscription = supabase
        .channel('credit_history')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credit_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newTransaction = payload.new as Transaction;
            setTransactions((prev) => [newTransaction, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };

    fetchData();
  }, [router, supabase]);

  const validateInput = () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount)) {
      setError('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return false;
    }
    if (amount <= 0) {
      setError('จำนวนเงินต้องมากกว่า 0');
      return false;
    }
    return true;
  };

  const handleAddCredit = async () => {
    setError(null);
    if (!validateInput()) return;

    const amount = parseFloat(creditAmount);
    setLoading(true);
    try {
      // Upsert user balance
      const { data: balanceData, error: upsertError } = await supabase
        .from('user_balances')
        .upsert(
          { 
            user_id: user.id, 
            balance: balance + amount, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        )
        .select('balance')
        .single();
      
      if (upsertError) throw upsertError;

      // Record transaction
      const { data: newTransaction, error: transactionError } = await supabase
      .from('credit_history')
      .insert({
        user_id: user.id,
        amount,
        transaction_type: 'deposit',
        description: 'เติมเครดิตผ่านหน้าเว็บ',
      })
      .select()
      .single()
      .returns<Transaction>(); // Add proper typing here
      
      if (transactionError) throw transactionError;

      // Update state
      setBalance(balanceData && typeof balanceData.balance === 'number' ? balanceData.balance : 0);
      setCreditAmount('');
      setTransactions([newTransaction, ...transactions]);

      toast.success('เติมเครดิตสำเร็จ!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเติมเครดิต');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    แดชบอร์ด
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>เติมเครดิต</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>เติมเครดิต</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">ยอดคงเหลือปัจจุบัน</p>
                <p className="text-2xl font-semibold">{balance.toFixed(2)} บาท</p>
              </div>
              <Input
                type="number"
                placeholder="จำนวนเงิน (บาท)"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="mb-3"
              />
              {error && <p className="text-destructive text-sm mb-3">{error}</p>}
              <Button
                onClick={handleAddCredit}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'กำลังดำเนินการ...' : 'เติมเครดิต'}
              </Button>
            </CardContent>
          </Card>

          <Card className="w-full max-w-md mt-6">
            <CardHeader>
              <CardTitle>ประวัติการเติมเครดิต</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground">ไม่มีประวัติการเติมเครดิต</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>จำนวนเงิน</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.created_at).toLocaleString('th-TH')}</TableCell>
                        <TableCell>{tx.amount.toFixed(2)} บาท</TableCell>
                        <TableCell>{tx.transaction_type === 'deposit' ? 'เติมเครดิต' : tx.transaction_type}</TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground mt-4">
            กลับไปที่{' '}
            <a href="/lottery" className="text-primary hover:underline">
              หน้าหลัก
            </a>
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}