 
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 
import { getSupabaseClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface AnalysisData {
  rank: number;
  number: string;
  lottery_type: string;
  number_type: string;
  total_purchase_amount: number; // แก้ไขจาก total_amount
  total_count: number;
  potential_payout: number;
  risk_level: string;
}

interface NumberAnalysis {
  number: string;
  digit_count: number;
  type_number: string;
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_purchases: number;
  total_amount: number;
  average_amount: number;
  payout_amount: number;
  purchase_frequency: number;
  risk_level: 'low' | 'medium' | 'high';
  last_purchased_date: string;
  purchase_trend: 'increasing' | 'decreasing' | 'stable';
}
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
}

export default function PaidAnalysisPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  const [lotteryTypes, setLotteryTypes] = useState<LotterySubType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLotteryType, setSelectedLotteryType] = useState<string>('all');
  const [selectedNumberType, setSelectedNumberType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sortField, setSortField] = useState<keyof AnalysisData>('potential_payout');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchLotteryTypes();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAnalysisData();
    }
  }, [selectedDate, selectedLotteryType, selectedNumberType]);

  const fetchLotteryTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_sub_types')
        .select('lottery_sub_type_id, sub_type_name, country_origin')
        .eq('is_active', true)
        .order('sub_type_name');

      if (error) throw error;
      setLotteryTypes(data || []);
    } catch (error) {
      console.error('Error fetching lottery types:', error);
    }
  };
  const analyzeLotteryNumbers = async (supabase: any, drawDate?: string): Promise<NumberAnalysis[]> => {
    try {
      let ticketQuery = supabase
        .from('lottery_tickets')
        .select(`
          id, 
          draw_date, 
          lottery_ticket_items!inner(
            id,
            numbers,
            amount,
            lottery_sub_number!inner(
              digit_number,
              type_number,
              price_paid
            ),
            lottery_sub_types!inner(
              lottery_sub_type_id,
              sub_type_name,
              country_origin
            )
          )
        `)
        .eq('status', 'confirmed');
      
      if (drawDate) {
        ticketQuery = ticketQuery.eq('draw_date', drawDate);
      }
      
      const { data: tickets, error: ticketError } = await ticketQuery;
      if (ticketError) throw ticketError;
      if (!tickets || tickets.length === 0) return [];
  
      // วิเคราะห์ข้อมูลหมายเลขหวย
      const numberAnalysis: Record<string, NumberAnalysis> = {};
      
      tickets.forEach((ticket: any) => {
        ticket.lottery_ticket_items.forEach((item: any) => {
          const { digit_number, type_number, price_paid } = item.lottery_sub_number;
          const { lottery_sub_type_id, sub_type_name, country_origin } = item.lottery_sub_types;
          
          item.numbers.forEach((number: string) => {
            const key = `${number}_${digit_number}_${type_number}_${lottery_sub_type_id}`;
            
            if (!numberAnalysis[key]) {
              numberAnalysis[key] = {
                number,
                digit_count: digit_number,
                type_number,
                lottery_sub_type_id,
                sub_type_name,
                country_origin,
                payout_amount: 0,
                total_purchases: 0,
                total_amount: 0,
                average_amount: 0,
                purchase_frequency: 0,
                risk_level: 'low',
                last_purchased_date: ticket.draw_date,
                purchase_trend: 'stable'
              };
            }
          
            const amount = Number(item.amount || 0);
            const payoutRate = Number(price_paid || 0);
            
            numberAnalysis[key].total_purchases += 1;
            numberAnalysis[key].total_amount += amount;
            numberAnalysis[key].payout_amount += amount * payoutRate;
            numberAnalysis[key].last_purchased_date = ticket.draw_date;
          });
        });
      });
  
      // 🔧 คำนวณสถิติเพิ่มเติม
      const analysisResults = Object.values(numberAnalysis).map((analysis: any) => {
        analysis.average_amount = analysis.total_amount / analysis.total_purchases;
        
        // กำหนดระดับความเสี่ยง - ปรับเกณฑ์ให้เหมาะสมกับข้อมูลจริง
        if (analysis.total_amount > 100) {
          analysis.risk_level = 'high';
        } else if (analysis.total_amount > 50) {
          analysis.risk_level = 'medium';
        } else {
          analysis.risk_level = 'low';
        }
        
        // 🔧 คำนวณความถี่การซื้อ
        analysis.purchase_frequency = analysis.total_purchases;
        
        return analysis;
      });
  
      // 🔧 เรียงลำดับตามยอดซื้อรวม
      return analysisResults.sort((a: any, b: any) => b.total_amount - a.total_amount);
    } catch (err) {
      console.error('Error in analyzeLotteryNumbers:', err);
      throw err;
    }
  };
  const fetchAnalysisData = async () => {
    setLoading(true);
    setError('');
  
    try {
      const supabase = getSupabaseClient();
      const data = await analyzeLotteryNumbers(supabase, format(selectedDate, 'yyyy-MM-dd'));
  
      // filter เฉพาะตามประเภทหวยและประเภทเลข (ถ้ามีการเลือก)
      const filtered = data
      .filter((item: NumberAnalysis) => {
        const typeMatch = selectedLotteryType === 'all' || item.lottery_sub_type_id.toString() === selectedLotteryType;
        const numberTypeMatch = selectedNumberType === 'all' || item.type_number === selectedNumberType;
        return typeMatch && numberTypeMatch;
      })
      .map((item: NumberAnalysis, index: number): AnalysisData => ({
        rank: index + 1,
        number: item.number,
        lottery_type: item.sub_type_name,
        number_type: item.type_number,
        total_purchase_amount: item.total_amount,
        total_count: item.total_purchases,
        potential_payout: item.payout_amount || 0,
        risk_level:
          item.risk_level === 'high'
            ? 'สูงมาก'
            : item.risk_level === 'medium'
            ? 'สูง'
            : 'ต่ำ',
      }));
  
      setAnalysisData(filtered);
      setLastUpdated(format(new Date(), 'dd/MM/yyyy HH:mm:ss'));
    } catch (error) {
      console.error('Error fetching analysis data:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };
  

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'สูงมาก':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'สูง':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ปานกลาง':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ต่ำ':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSort = (field: keyof AnalysisData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // ตั้งค่าเริ่มต้นให้เรียงจากมากไปน้อยสำหรับฟิลด์ตัวเลข
      if (field === 'total_purchase_amount' || field === 'total_count' || field === 'potential_payout') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const getSortedData = () => {
    if (!Array.isArray(analysisData)) return [];
    
    const sorted = [...analysisData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Convert to numbers for numeric fields
      if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // อัปเดตอันดับใหม่ตามลำดับที่เรียงแล้ว (ไม่ใช้ rank เดิม)
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  };

  const SortIcon = ({ field }: { field: keyof AnalysisData }) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  const exportToCSV = () => {
    const sortedData = getSortedData();
    if (sortedData.length === 0) return;

    const headers = ['อันดับ', 'หมายเลข', 'ชนิดหวย', 'ประเภทเลข', 'ยอดซื้อรวม', 'จำนวนรวม', 'รางวัลที่ต้องจ่าย', 'ระดับความเสี่ยง'];
    const csvContent = [
      headers.join(','),
      ...sortedData.map(item => [
        item.rank,
        item.number,
        item.lottery_type,
        item.number_type,
        item.total_purchase_amount, // แก้ไขชื่อ property
        item.total_count,
        item.potential_payout,
        item.risk_level
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lottery-analysis-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">การวิเคราะห์ข้อมูลการซื้อหวย</h1>
          <p className="text-gray-600 mt-1">วิเคราะห์ข้อมูลการซื้อหวยตามวันที่และประเภทหวย</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            อัปเดตล่าสุด: {lastUpdated}
          </div>
          {getSortedData().length > 0 && (
            <div className="text-sm text-green-600 font-medium">
                พบข้อมูล {getSortedData().length} รายการ
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ตัวกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">วันที่</label>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ประเภทหวย</label>
              <Select value={selectedLotteryType} onValueChange={setSelectedLotteryType}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทหวย" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {lotteryTypes.map((type) => (
                    <SelectItem key={type.lottery_sub_type_id} value={type.lottery_sub_type_id.toString()}>
                      {type.sub_type_name} ({type.country_origin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ประเภทเลข</label>
              <Select value={selectedNumberType} onValueChange={setSelectedNumberType}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทเลข" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="3ตัวบน">3 ตัวบน</SelectItem>
                  <SelectItem value="3ตัวล่าง">3 ตัวล่าง</SelectItem>
                  <SelectItem value="3ตัวโต๊ด">3 ตัวโต๊ด</SelectItem>
                  <SelectItem value="2ตัวบน">2 ตัวบน</SelectItem>
                  <SelectItem value="2ตัวล่าง">2 ตัวล่าง</SelectItem>
                  <SelectItem value="2ตัวโต๊ด">2 ตัวโต๊ด</SelectItem>
                  <SelectItem value="เลขวิ่งบน">เลขวิ่งบน</SelectItem>
                  <SelectItem value="เลขวิ่งล่าง">เลขวิ่งล่าง</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <Button onClick={fetchAnalysisData} disabled={loading} className="flex-1">
                {loading ? 'กำลังโหลด...' : 'อัปเดตข้อมูล'}
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={getSortedData().length === 0}
                variant="outline"
                className="flex-1"
              >
                ส่งออก CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Summary Statistics */}
      {getSortedData().length > 0 && !loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>สรุปสถิติ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {getSortedData().length}
                </div>
                <div className="text-sm text-gray-600">จำนวนหมายเลขที่วิเคราะห์</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(getSortedData().reduce((sum, item) => sum + (item.total_purchase_amount || 0), 0))}
                </div>
                <div className="text-sm text-gray-600">ยอดซื้อรวมทั้งหมด</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.max(...getSortedData().map(item => item.potential_payout || 0)))}
                </div>
                <div className="text-sm text-gray-600">รางวัลที่ต้องจ่ายสูงสุด</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {getSortedData().filter(item => item.risk_level === 'สูงมาก' || item.risk_level === 'สูง').length}
                </div>
                <div className="text-sm text-gray-600">หมายเลขที่มีรางวัลสูงอาจมีความเสี่ยงต่ำได้ ถ้ายอดซื้อรวมน้อย</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            วิเคราะห์หมายเลขหวย - {format(selectedDate, 'dd/MM/yyyy', { locale: th })}
            {selectedLotteryType !== 'all' && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                ({lotteryTypes.find(t => t.lottery_sub_type_id.toString() === selectedLotteryType)?.sub_type_name})
              </span>
            )}
            {selectedNumberType !== 'all' && (
              <span className="text-lg font-normal text-purple-600 ml-2">
                - {selectedNumberType}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">กำลังวิเคราะห์ข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-medium">เกิดข้อผิดพลาด</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : !Array.isArray(analysisData) || analysisData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">ไม่พบข้อมูลสำหรับวันที่เลือก</p>
            </div>
          ) : getSortedData().length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('rank')}>
                      <div className="flex items-center justify-center gap-1">
                        อันดับ
                        <SortIcon field="rank" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('number')}>
                      <div className="flex items-center justify-center gap-1">
                        หมายเลข
                        <SortIcon field="number" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('lottery_type')}>
                      <div className="flex items-center justify-center gap-1">
                        ชนิดหวย
                        <SortIcon field="lottery_type" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('number_type')}>
                      <div className="flex items-center justify-center gap-1">
                        ประเภทเลข
                        <SortIcon field="number_type" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total_purchase_amount')}>
                      <div className="flex items-center justify-center gap-1">
                        ยอดซื้อรวม
                        <SortIcon field="total_purchase_amount" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total_count')}>
                      <div className="flex items-center justify-center gap-1">
                        จำนวนรวม
                        <SortIcon field="total_count" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('potential_payout')}>
                      <div className="flex items-center justify-center gap-1">
                        รางวัลที่ต้องจ่าย
                        <SortIcon field="potential_payout" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('risk_level')}>
                      <div className="flex items-center justify-center gap-1">
                        ระดับความเสี่ยง
                        <SortIcon field="risk_level" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedData().map((item) => (
                    <TableRow key={`${item.number}-${item.lottery_type}-${item.number_type}`} className="hover:bg-gray-50">
                      <TableCell className="text-center font-medium">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {item.rank || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-mono text-lg font-bold text-gray-900">
                          {item.number || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm font-medium text-gray-900">{item.lottery_type || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm font-medium text-purple-600">{item.number_type || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-green-600">
                        {/* <<< แก้ไขชื่อ property ที่นี่ */}
                        {formatCurrency(item.total_purchase_amount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {(item.total_count || 0).toLocaleString('th-TH')}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-medium text-red-600">
                        {formatCurrency(item.potential_payout || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getRiskLevelColor(item.risk_level || 'ต่ำ')}>
                          {item.risk_level || 'ต่ำ'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      
    </div>
  );
}
 