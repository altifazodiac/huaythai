"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, X, TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3, Hash, AlertCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
 
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from '@/lib/contexts/AuthContext';
import { countryFlagImg } from "@/lib/utils/flags";
import { Badge } from "@/components/ui/badge";

// Comprehensive interfaces for detailed lottery analysis
interface DailySummary {
  draw_date: string;
  total_bills: number;
  total_numbers: number;
  total_purchase_amount: number;
  total_payout: number;
  net_profit_loss: number;
}

interface LotteryTypeSummary {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_bills: number;
  total_numbers: number;
  total_purchase_amount: number;
  total_payout: number;
  net_profit_loss: number;
}

interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  sub_type_name: string;
  country_origin: string;
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  total_numbers: number;
  status: string;
}

interface NumberDetail {
  id: string;
  bill_number: string;
  lottery_type_name: string;
  digit_number: number;
  type_number: string;
  numbers: string[];
  amount: number;
  price_paid: number;
  is_winning: boolean;
  payout_amount: number;
  winning_numbers?: string;
}

// Comprehensive data fetching functions using authenticated Supabase client
const fetchDailySummary = async (supabase: any): Promise<DailySummary[]> => {
  const { data, error } = await supabase.rpc('get_daily_lottery_summary');
  if (error) throw error;
  return data || [];
};

const fetchLotteryTypeSummary = async (supabase: any, drawDate?: string): Promise<LotteryTypeSummary[]> => {
  const { data, error } = await supabase.rpc('get_lottery_type_summary', { p_draw_date: drawDate });
  if (error) throw error;
  return data || [];
};

const fetchBillSummary = async (supabase: any, drawDate?: string, lotteryTypeId?: number): Promise<BillSummary[]> => {
  try {
    console.log('Fetching bill summary with params:', { drawDate, lotteryTypeId });
    
    const params: any = {};
    if (drawDate) params.p_draw_date = drawDate;
    if (lotteryTypeId) params.p_lottery_type_id = lotteryTypeId;
    
    console.log('Calling RPC with params:', params);
    
    const { data, error } = await supabase.rpc('get_bill_summary', params);
    
    if (error) {
      console.error('Error in get_bill_summary RPC call:', error);
      throw error;
    }
    
    console.log('Received bill summary data:', data);
    return data || [];
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};

const fetchNumberDetails = async (supabase: any, billNumber?: string): Promise<NumberDetail[]> => {
  const { data, error } = await supabase.rpc('get_number_details', { p_bill_number: billNumber });
  if (error) throw error;
  return data || [];
};

const LotterySummaryPage: React.FC = () => {
  const { supabase, user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [lotteryTypeSummary, setLotteryTypeSummary] = useState<LotteryTypeSummary[]>([]);
  const [billSummary, setBillSummary] = useState<BillSummary[]>([]);
  const [numberDetails, setNumberDetails] = useState<NumberDetail[]>([]);

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLotteryType, setSelectedLotteryType] = useState<number | null>(null);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
 
  useRequireAuth();

  // Load initial data
  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [supabase]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [dailyData, typeData, billData, numberData] = await Promise.all([
        fetchDailySummary(supabase),
        fetchLotteryTypeSummary(supabase, selectedDate || undefined),
        fetchBillSummary(supabase, selectedDate || undefined, selectedLotteryType || undefined),
        fetchNumberDetails(supabase, selectedBillNumber || undefined)
      ]);
      
      setDailySummary(dailyData);
      setLotteryTypeSummary(typeData);
      setBillSummary(billData);
      setNumberDetails(numberData);
    } catch (err) {
      console.error('Data loading error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    if (!supabase) return;
    const timeoutId = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedDate, selectedLotteryType, selectedBillNumber]);

  // Format currency in Thai Baht
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format date in Thai locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setSelectedDate('');
    setSelectedLotteryType(null);
    setSelectedBillNumber('');
    setSearchTerm('');
  };

  // Data fetching functions
  const fetchDailySummary = async (supabase: any): Promise<DailySummary[]> => {
    const { data, error } = await supabase.rpc('get_daily_lottery_summary');
    if (error) throw error;
    return data || [];
  };

  const fetchLotteryTypeSummary = async (supabase: any, drawDate?: string): Promise<LotteryTypeSummary[]> => {
    const { data, error } = await supabase.rpc('get_lottery_type_summary', {
      p_draw_date: drawDate || null
    });
    if (error) throw error;
    return data || [];
  };

  const fetchBillSummary = async (supabase: any, drawDate?: string, lotteryTypeId?: number): Promise<BillSummary[]> => {
    const { data, error } = await supabase.rpc('get_bill_summary', {
      p_draw_date: drawDate || null,
      p_lottery_type_id: lotteryTypeId || null
    });
    if (error) throw error;
    return data || [];
  };

  const fetchNumberDetails = async (supabase: any, billNumber?: string): Promise<NumberDetail[]> => {
    const { data, error } = await supabase.rpc('get_number_details', {
      p_bill_number: billNumber || null
    });
    if (error) throw error;
    return data || [];
  };

  const renderDailySummaryTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            สรุปรายวัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">จำนวนบิล</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySummary.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedDate(item.draw_date);
                      setActiveTab('types');
                    }}
                  >
                    <TableCell className="font-medium">
                      {formatDate(item.draw_date)}
                    </TableCell>
                    <TableCell className="text-right">{item.total_bills.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_purchase_amount))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(item.net_profit_loss))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLotteryTypesTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            สรุปตามประเภทหวย
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {formatDate(selectedDate)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>ประเทศ</TableHead>
                  <TableHead className="text-right">จำนวนบิล</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotteryTypeSummary.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedLotteryType(item.lottery_sub_type_id);
                      setActiveTab('bills');
                    }}
                  >
                    <TableCell className="font-medium">{item.sub_type_name}</TableCell>
                    <TableCell>{item.country_origin}</TableCell>
                    <TableCell className="text-right">{item.total_bills.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_purchase_amount))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(item.net_profit_loss))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillsTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            สรุปตามบิล
            {(selectedDate || selectedLotteryType) && (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedDate && formatDate(selectedDate)}
                {selectedLotteryType && ` (ID: ${selectedLotteryType})`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่บิล</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billSummary.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedBillNumber(item.bill_number);
                      setActiveTab('numbers');
                    }}
                  >
                    <TableCell className="font-medium">{item.bill_number}</TableCell>
                    <TableCell>{formatDate(item.draw_date)}</TableCell>
                    <TableCell>{item.user_name || 'ไม่ระบุ'}</TableCell>
                    <TableCell>{item.sub_type_name} ({item.country_origin})</TableCell>
                    <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_amount))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(item.net_profit_loss))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNumbersTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            รายละเอียดเลข
            {selectedBillNumber && (
              <span className="text-sm font-normal text-muted-foreground">
                - บิล {selectedBillNumber}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>บิล</TableHead>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>จำนวนหลัก</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>เลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">อัตราจ่าย</TableHead>
                  <TableHead className="text-center">ถูกรางวัล</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead>เลขที่ออก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numberDetails.map((item, index) => (
                  <TableRow key={index} className={item.is_winning ? 'bg-green-50' : ''}>
                    <TableCell className="font-medium">{item.bill_number}</TableCell>
                    <TableCell>{item.lottery_type_name}</TableCell>
                    <TableCell className="text-center">{item.digit_number}</TableCell>
                    <TableCell>{item.type_number}</TableCell>
                    <TableCell className="font-mono">{item.numbers.join(', ')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                    <TableCell className="text-right">{item.price_paid}x</TableCell>
                    <TableCell className="text-center">
                      {item.is_winning ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ถูก
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ไม่ถูก
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.is_winning ? formatCurrency(Number(item.payout_amount)) : '-'}
                    </TableCell>
                    <TableCell className="font-mono">{item.winning_numbers || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
     
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>สรุปยอดขาย</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground p-2 md:p-4 transition-colors duration-500">
            <div className="container mx-auto">
              <header className="mb-6 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-500 dark:from-red-600 dark:via-red-400 dark:to-red-400">
                  วิเคราะห์ยอดขายหวย
                </h1>
                <p className="text-sm text-muted-foreground mt-2">สรุปและวิเคราะห์ข้อมูลการขายหวยแบบละเอียด</p>
              </header>

              {/* Filter Controls */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    ตัวกรองข้อมูล
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">วันที่</label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">ประเภทหวย ID</label>
                      <Input
                        type="number"
                        value={selectedLotteryType || ''}
                        onChange={(e) => setSelectedLotteryType(e.target.value ? Number(e.target.value) : null)}
                        placeholder="เลือกประเภทหวย"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">เลขที่บิล</label>
                      <Input
                        type="text"
                        value={selectedBillNumber}
                        onChange={(e) => setSelectedBillNumber(e.target.value)}
                        placeholder="ใส่เลขที่บิล"
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={clearFilters} variant="outline" className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        ล้างตัวกรอง
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center h-64">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-t-primary border-r-primary border-b-muted border-l-muted rounded-full"
                  ></motion.div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-destructive text-lg">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Main Content - Tabbed Interface */}
              {!isLoading && !error && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="daily" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      รายวัน
                    </TabsTrigger>
                    <TabsTrigger value="types" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      ประเภทหวย
                    </TabsTrigger>
                    <TabsTrigger value="bills" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      บิล
                    </TabsTrigger>
                    <TabsTrigger value="numbers" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      เลข
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily" className="mt-6">
                    {renderDailySummaryTab()}
                  </TabsContent>

                  <TabsContent value="types" className="mt-6">
                    {renderLotteryTypesTab()}
                  </TabsContent>

                  <TabsContent value="bills" className="mt-6">
                    {renderBillsTab()}
                  </TabsContent>

                  <TabsContent value="numbers" className="mt-6">
                    {renderNumbersTab()}
                  </TabsContent>
                </Tabs>
              )}

              <footer className="text-center mt-12 text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Lottery Insights. All rights reserved.</p>
              </footer>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
};

export default LotterySummaryPage;

