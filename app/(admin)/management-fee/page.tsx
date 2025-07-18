'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Calculator, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ManagementFeeCycle {
  cycle_id: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
  total_profit_loss: number;
  management_fee_amount: number;
  total_net_amount: number;
  remaining_balance: number;
  is_paid: boolean;
  paid_at: string | null;
  daily_records: DailyRecord[];
}

interface DailyRecord {
  id: string;
  cycle_id: string;
  record_date: string;
  daily_profit_loss: number;
  daily_net_amount: number;
  daily_management_fee: number;
  cumulative_profit_loss: number;
  cumulative_net_amount: number;
  cumulative_management_fee: number;
  created_at: string;
}

export default function ManagementFeePage() {
  const [cycles, setCycles] = useState<ManagementFeeCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ManagementFeeCycle | null>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const loadManagementFeeCycles = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading management fee cycles...');
      
      // ตรวจสอบ authentication ก่อน
      if (!user) {
        console.log('No user, skipping data load');
        setCycles([]);
        return;
      }
      
      // ตรวจสอบ session อีกครั้งก่อนเรียก API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session, skipping data load');
        setCycles([]);
        return;
      }
      
      // ใช้ Supabase client โดยตรง
      const { data: cycles, error: cyclesError } = await supabase
        .from('management_fee_cycles')
        .select('*')
        .order('cycle_number', { ascending: false });
      
      console.log('Cycles query result:', { cycles: cycles?.length, cyclesError });
      
      if (cyclesError) {
        console.error('Cycles fetch error:', cyclesError);
        // ถ้าเป็น authentication error ให้ clear user state
        if (cyclesError.code === 'PGRST301' || cyclesError.message?.includes('JWT')) {
          setUser(null);
          setError('Session expired. Please login again.');
          return;
        }
        throw cyclesError;
      }
      
      // ดึงข้อมูลรายวันสำหรับแต่ละรอบ
      const cyclesWithDailyRecords = await Promise.all(
        (cycles || []).map(async (cycle) => {
          const { data: dailyRecords, error: dailyError } = await supabase
            .from('management_fee_daily_records')
            .select('*')
            .eq('cycle_id', cycle.id)
            .order('record_date', { ascending: true });
          
          if (dailyError) {
            console.error('Daily records fetch error:', dailyError);
          }
          
          return {
            cycle_id: cycle.id,
            cycle_number: cycle.cycle_number,
            start_date: cycle.cycle_start_date,
            end_date: cycle.cycle_end_date,
            total_profit_loss: cycle.total_profit_loss,
            management_fee_amount: cycle.management_fee_amount,
            total_net_amount: cycle.total_net_amount,
            remaining_balance: cycle.remaining_balance,
            is_paid: cycle.is_paid,
            paid_at: cycle.paid_at,
            daily_records: dailyRecords || []
          };
        })
      );
      
      console.log('Setting cycles data:', cyclesWithDailyRecords);
      setCycles(cyclesWithDailyRecords);
    } catch (error) {
      console.error('Error loading management fee cycles:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      // Set empty array to prevent undefined errors
      setCycles([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewCycle = async () => {
    try {
      setCreatingCycle(true);
      
      // ตรวจสอบ authentication ก่อน
      if (!user) {
        throw new Error('Please login to create a new cycle');
      }
      
      // ใช้ Supabase client โดยตรง
      const { data: cycleId, error } = await supabase.rpc('auto_create_management_fee_cycle');
      
      if (error) {
        console.error('Create cycle error:', error);
        throw error;
      }
      
      console.log('New cycle created:', cycleId);
      await loadManagementFeeCycles();
    } catch (error) {
      console.error('Error creating new cycle:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setCreatingCycle(false);
    }
  };

  const markCycleAsPaid = async (cycleId: string) => {
    try {
      // ตรวจสอบ authentication ก่อน
      if (!user) {
        throw new Error('Please login to mark cycle as paid');
      }
      
      // ใช้ Supabase client โดยตรง
      const { error } = await supabase
        .from('management_fee_cycles')
        .update({ 
          is_paid: true, 
          paid_at: new Date().toISOString() 
        })
        .eq('id', cycleId);
      
      if (error) {
        console.error('Mark paid error:', error);
        throw error;
      }
      
      console.log('Cycle marked as paid:', cycleId);
      await loadManagementFeeCycles();
    } catch (error) {
      console.error('Error marking cycle as paid:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  useEffect(() => {
    // ตรวจสอบ authentication ก่อน
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        
        // ลองใช้ getUser ก่อน
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('getUser result:', { user: user?.email, userError });
        
        if (user && !userError) {
          console.log('User found via getUser:', user.email);
          setUser(user);
          await loadManagementFeeCycles();
          return;
        }
        
        // ถ้า getUser ไม่ได้ ลองใช้ getSession
        console.log('Trying getSession...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('getSession result:', { session: session?.user?.email, sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication error: ' + sessionError.message);
          return;
        }
        
        if (!session || !session.user) {
          console.log('No session found');
          setError('Please login to access this page');
          return;
        }
        
        console.log('Session found:', session.user.email);
        setUser(session.user);
        await loadManagementFeeCycles();
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Authentication check failed. Please login again.');
      }
    };
    
    checkAuth();

    // เพิ่ม session listener เพื่อติดตามการเปลี่ยนแปลง
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setError(null);
          await loadManagementFeeCycles();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setError('Please login to access this page');
          setCycles([]);
        }
      }
    );

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  const currentCycle = cycles.find(cycle => !cycle.is_paid);
  const totalUnpaidAmount = cycles
    .filter(cycle => !cycle.is_paid)
    .reduce((sum, cycle) => sum + Math.abs(cycle.remaining_balance), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ระบบจัดการค่าบริหารระบบ
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            จัดการค่าบริหารระบบทุก 7 วัน
          </p>
        </div>
        <Button 
          onClick={createNewCycle} 
          disabled={creatingCycle}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {creatingCycle ? 'กำลังสร้าง...' : 'สร้างรอบใหม่'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">เกิดข้อผิดพลาด:</span>
                <span>{error}</span>
              </div>
              {!user && (
                <div className="mt-2">
                  <Button 
                    onClick={() => window.location.href = '/auth/login'}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </div>
              )}
              {user && (
                <div className="mt-2 space-x-2">
                  <Button 
                    onClick={loadManagementFeeCycles}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    ลองใหม่
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        const { data: { user }, error } = await supabase.auth.getUser();
                        console.log('Manual auth check:', { user: user?.email, error });
                        if (user) {
                          setUser(user);
                          setError(null);
                          await loadManagementFeeCycles();
                        } else {
                          setError('Session not found. Please login again.');
                        }
                      } catch (error) {
                        console.error('Manual auth check failed:', error);
                        setError('Authentication check failed.');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    รีเฟรช Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Authentication Status */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">เข้าสู่ระบบแล้ว:</span>
                  <span>{user.email}</span>
                  <span className="text-xs text-green-600">(ID: {user.id})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        console.log('Current session:', session);
                        alert(`Session: ${session ? 'Found' : 'Not found'}\nUser: ${session?.user?.email || 'None'}`);
                      } catch (error) {
                        console.error('Session check failed:', error);
                        alert('Session check failed: ' + error);
                      }
                    }}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    ตรวจสอบ Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    ออกจากระบบ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      {user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" />
                รอบทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cycles.length}</div>
              <p className="text-blue-100 text-sm">รอบการคำนวณ</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5" />
                ชำระแล้ว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {cycles.filter(cycle => cycle.is_paid).length}
              </div>
              <p className="text-green-100 text-sm">รอบที่ชำระแล้ว</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                รอชำระ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {cycles.filter(cycle => !cycle.is_paid).length}
              </div>
              <p className="text-orange-100 text-sm">รอบที่รอชำระ</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                ยอดรวมรอชำระ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(totalUnpaidAmount)}
              </div>
              <p className="text-purple-100 text-sm">ยอดคงเหลือรวม</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            กรุณาเข้าสู่ระบบเพื่อดูข้อมูล
          </div>
          <Button 
            onClick={() => window.location.href = '/auth/login'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            เข้าสู่ระบบ
          </Button>
        </div>
      )}

      {/* Current Cycle Alert */}
      {user && currentCycle && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Clock className="h-5 w-5" />
                รอบปัจจุบัน: รอบที่ {currentCycle.cycle_number}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-300">ช่วงเวลา</p>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    {formatDate(currentCycle.start_date)} - {formatDate(currentCycle.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-300">ค่าบริหารระบบ</p>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    {formatCurrency(Math.abs(currentCycle.management_fee_amount))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-300">ยอดคงเหลือ</p>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    {formatCurrency(Math.abs(currentCycle.remaining_balance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cycles Table */}
      {user && (
        <Card>
        <CardHeader>
          <CardTitle>ประวัติรอบการคำนวณ</CardTitle>
          <CardDescription>
            รายการรอบการคำนวณค่าบริหารระบบทั้งหมด
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รอบที่</TableHead>
                  <TableHead>ช่วงเวลา</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                  <TableHead className="text-right">ค่าบริหารระบบ</TableHead>
                  <TableHead className="text-right">ยอดสุทธิ</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {cycles.map((cycle, index) => (
                    <motion.tr
                      key={cycle.cycle_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setSelectedCycle(cycle)}
                    >
                      <TableCell className="font-semibold">
                        รอบที่ {cycle.cycle_number}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(cycle.start_date)}</div>
                          <div className="text-gray-500">ถึง</div>
                          <div>{formatDate(cycle.end_date)}</div>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        cycle.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(cycle.total_profit_loss)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {formatCurrency(Math.abs(cycle.management_fee_amount))}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        cycle.total_net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(cycle.total_net_amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {formatCurrency(Math.abs(cycle.remaining_balance))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cycle.is_paid ? "default" : "secondary"}>
                          {cycle.is_paid ? 'ชำระแล้ว' : 'รอชำระ'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!cycle.is_paid && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markCycleAsPaid(cycle.cycle_id);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            มาร์คเป็นชำระแล้ว
                          </Button>
                        )}
                        {cycle.is_paid && cycle.paid_at && (
                          <div className="text-sm text-gray-500">
                            {new Date(cycle.paid_at).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {/* Cycle Detail Modal */}
      {user && selectedCycle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCycle(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                รายละเอียดรอบที่ {selectedCycle.cycle_number}
              </h2>
              <Button
                variant="outline"
                onClick={() => setSelectedCycle(null)}
              >
                ปิด
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">สรุปการคำนวณ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>กำไร/ขาดทุนรวม:</span>
                    <span className={`font-semibold ${
                      selectedCycle.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(selectedCycle.total_profit_loss)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าบริหารระบบ (5%):</span>
                    <span className="font-semibold text-purple-600">
                      {formatCurrency(Math.abs(selectedCycle.management_fee_amount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ยอดสุทธิ:</span>
                    <span className={`font-semibold ${
                      selectedCycle.total_net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(selectedCycle.total_net_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="font-semibold">ยอดคงเหลือ:</span>
                    <span className="font-semibold text-purple-600">
                      {formatCurrency(Math.abs(selectedCycle.remaining_balance))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลรอบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>วันที่เริ่ม:</span>
                    <span className="font-semibold">
                      {formatDate(selectedCycle.start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันที่สิ้นสุด:</span>
                    <span className="font-semibold">
                      {formatDate(selectedCycle.end_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>สถานะ:</span>
                    <Badge variant={selectedCycle.is_paid ? "default" : "secondary"}>
                      {selectedCycle.is_paid ? 'ชำระแล้ว' : 'รอชำระ'}
                    </Badge>
                  </div>
                  {selectedCycle.paid_at && (
                    <div className="flex justify-between">
                      <span>วันที่ชำระ:</span>
                      <span className="font-semibold">
                        {new Date(selectedCycle.paid_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Records Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">บันทึกรายวัน</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                      <TableHead className="text-right">ยอดสุทธิ</TableHead>
                      <TableHead className="text-right">ค่าบริหาร</TableHead>
                      <TableHead className="text-right">ยอดสะสม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCycle.daily_records.map((record, index) => (
                      <TableRow key={record.id || index}>
                        <TableCell>{formatDate(record.record_date)}</TableCell>
                        <TableCell className={`text-right ${
                          record.daily_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(record.daily_profit_loss)}
                        </TableCell>
                        <TableCell className={`text-right ${
                          record.daily_net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(record.daily_net_amount)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600">
                          {formatCurrency(record.daily_management_fee)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600">
                          {formatCurrency(record.cumulative_management_fee)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
} 