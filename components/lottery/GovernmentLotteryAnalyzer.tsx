"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Plus, Settings, Ban, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Props {
  lottery_sub_type_id: number;
  onClose: () => void;
}

interface NumberSalesData {
  number: string;
  digit_count: number;
  type_number: string;
  total_sales: number;
  price_paid: number;
  potential_payout: number;
  risk_percentage: number;
  is_capped: boolean;
  total_bets: number;
}

interface SalesAnalysis {
  total_sales_all: number;
  total_potential_payout: number;
  overall_risk_percentage: number;
  high_risk_numbers: NumberSalesData[];
  medium_risk_numbers: NumberSalesData[];
  safe_numbers: NumberSalesData[];
}

interface ManagedNumber {
  number: string;
  digit_count: number;
  type_number: string;
  action: 'half' | 'close'; // หารครึ่ง หรือ ปิดรับ
  reason: string;
  is_manual: boolean; // เพิ่มด้วยตนเอง
}

export default function GovernmentLotteryAnalyzer({ lottery_sub_type_id, onClose }: Props) {
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [riskThreshold, setRiskThreshold] = useState(70); // 70% risk threshold
  const [testMode, setTestMode] = useState(false); // Test mode with sample data
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [managedNumbers, setManagedNumbers] = useState<ManagedNumber[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [manualDigitCount, setManualDigitCount] = useState<number>(3);
  const [manualTypeNumber, setManualTypeNumber] = useState('บน');
  const [manualAction, setManualAction] = useState<'half' | 'close'>('half');
  const [manualReason, setManualReason] = useState('เลขดัง');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const generateSampleData = () => {
    const sampleAnalysis: SalesAnalysis = {
      total_sales_all: 125000,
      total_potential_payout: 95000,
      overall_risk_percentage: 76.0,
      high_risk_numbers: [
        { number: "123", digit_count: 3, type_number: "บน", total_sales: 1500, price_paid: 900, potential_payout: 1350000, risk_percentage: 100.0, is_capped: true, total_bets: 15 },
        { number: "456", digit_count: 3, type_number: "โต๊ด", total_sales: 800, price_paid: 150, potential_payout: 120000, risk_percentage: 96.0, is_capped: true, total_bets: 8 },
        { number: "12", digit_count: 2, type_number: "ล่าง", total_sales: 1200, price_paid: 90, potential_payout: 108000, risk_percentage: 86.4, is_capped: true, total_bets: 24 },
        { number: "78", digit_count: 2, type_number: "บน", total_sales: 1000, price_paid: 95, potential_payout: 95000, risk_percentage: 76.0, is_capped: true, total_bets: 20 }
      ],
      medium_risk_numbers: [
        { number: "789", digit_count: 3, type_number: "บน", total_sales: 600, price_paid: 900, potential_payout: 540000, risk_percentage: 43.2, is_capped: false, total_bets: 6 },
        { number: "34", digit_count: 2, type_number: "ล่าง", total_sales: 500, price_paid: 90, potential_payout: 45000, risk_percentage: 36.0, is_capped: false, total_bets: 10 },
        { number: "56", digit_count: 2, type_number: "บน", total_sales: 400, price_paid: 95, potential_payout: 38000, risk_percentage: 30.4, is_capped: false, total_bets: 8 }
      ],
      safe_numbers: [
        { number: "001", digit_count: 3, type_number: "บน", total_sales: 300, price_paid: 900, potential_payout: 270000, risk_percentage: 21.6, is_capped: false, total_bets: 3 },
        { number: "56", digit_count: 2, type_number: "ล่าง", total_sales: 200, price_paid: 90, potential_payout: 18000, risk_percentage: 14.4, is_capped: false, total_bets: 4 }
      ]
    };
    setAnalysis(sampleAnalysis);
    const sampleManagedNumbers: ManagedNumber[] = [
      { number: "123", digit_count: 3, type_number: "บน", action: "close", reason: "ความเสี่ยง 100%+", is_manual: false },
      { number: "999", digit_count: 3, type_number: "บน", action: "half", reason: "เลขดัง", is_manual: true },
      { number: "456", digit_count: 3, type_number: "โต๊ด", action: "half", reason: "ความเสี่ยง 96.0%", is_manual: false }
    ];
    setManagedNumbers(sampleManagedNumbers);
    toast.success("✅ แสดงข้อมูลตัวอย่างสำหรับทดสอบ", { duration: 3000 });
  };

  const fetchSalesAnalysis = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('lottery_tickets')
        .select(`total_amount, lottery_ticket_items!inner(numbers, amount, lottery_sub_type_id, lottery_sub_number_id)`)
        .eq('draw_date', selectedDate)
        .eq('status', 'confirmed');
      if (salesError) throw new Error(`Database error: ${salesError.message}`);
      
      const { data: payoutRules, error: payoutError } = await supabase
        .from('lottery_sub_number')
        .select('*')
        .eq('lottery_sub_type_id', lottery_sub_type_id);
      if (payoutError) throw new Error(`Payout rules error: ${payoutError.message}`);

      if (!salesData || salesData.length === 0) {
        setAnalysis({ total_sales_all: 0, total_potential_payout: 0, overall_risk_percentage: 0, high_risk_numbers: [], medium_risk_numbers: [], safe_numbers: [] });
        return;
      }

      const payoutRulesMap: Record<number, any> = {};
      payoutRules?.forEach(rule => { payoutRulesMap[rule.id] = rule; });

      const numberSalesMap: Record<string, NumberSalesData> = {};
      let totalSalesAll = 0;

      salesData.forEach(ticket => {
        totalSalesAll += Number(ticket.total_amount || 0);
        ticket.lottery_ticket_items?.forEach(item => {
          const payoutRule = payoutRulesMap[item.lottery_sub_number_id];
          if (!payoutRule) return;
          item.numbers?.forEach((number: string) => {
            const key = `${number}-${payoutRule.digit_number}-${payoutRule.type_number}`;
            if (!numberSalesMap[key]) {
              numberSalesMap[key] = { number, digit_count: payoutRule.digit_number, type_number: payoutRule.type_number, total_sales: 0, price_paid: Number(payoutRule.price_paid || 0), potential_payout: 0, risk_percentage: 0, is_capped: false, total_bets: 0 };
            }
            const sales = Number(item.amount || 0);
            numberSalesMap[key].total_sales += sales;
            numberSalesMap[key].total_bets += 1;
            numberSalesMap[key].potential_payout = numberSalesMap[key].total_sales * numberSalesMap[key].price_paid;
          });
        });
      });

      Object.values(numberSalesMap).forEach(numberData => {
        numberData.risk_percentage = totalSalesAll > 0 ? (numberData.potential_payout / totalSalesAll) * 100 : 0;
        numberData.is_capped = numberData.risk_percentage > riskThreshold;
      });

      const allNumbers = Object.values(numberSalesMap);
      const highRiskNumbers = allNumbers.filter(n => n.risk_percentage > riskThreshold);
      const mediumRiskNumbers = allNumbers.filter(n => n.risk_percentage > riskThreshold / 2 && n.risk_percentage <= riskThreshold);
      const safeNumbers = allNumbers.filter(n => n.risk_percentage <= riskThreshold / 2);

      const totalPotentialPayout = allNumbers.reduce((sum, n) => sum + n.potential_payout, 0);
      const overallRiskPercentage = totalSalesAll > 0 ? (totalPotentialPayout / totalSalesAll) * 100 : 0;

      setAnalysis({
        total_sales_all: totalSalesAll,
        total_potential_payout: totalPotentialPayout,
        overall_risk_percentage: overallRiskPercentage,
        high_risk_numbers: highRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        medium_risk_numbers: mediumRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        safe_numbers: safeNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage)
      });

      if (highRiskNumbers.length > 0) {
        toast.warning(`⚠️ พบเลขอั้น ${highRiskNumbers.length} เลข ควรจัดการด่วน`, { duration: 4000 });
      } else {
        toast.success(`✅ ไม่พบเลขอั้น ความเสี่ยงอยู่ในระดับปกติ`, { duration: 3000 });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล';
      toast.error(errorMessage);
      setAnalysis({ total_sales_all: 0, total_potential_payout: 0, overall_risk_percentage: 0, high_risk_numbers: [], medium_risk_numbers: [], safe_numbers: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!testMode) {
      fetchSalesAnalysis();
    }
  }, [selectedDate, riskThreshold, testMode]);

  const toggleNumberSelection = (numberKey: string) => {
    setSelectedNumbers(prev => prev.includes(numberKey) ? prev.filter(key => key !== numberKey) : [...prev, numberKey]);
  };
  
  const addSelectedToManaged = (action: 'half' | 'close') => {
    if (selectedNumbers.length === 0) {
      toast.error('กรุณาเลือกหมายเลขก่อน');
      return;
    }
    const allNumbers = [...(analysis?.high_risk_numbers || []), ...(analysis?.medium_risk_numbers || []), ...(analysis?.safe_numbers || [])];
    const newManagedNumbers: ManagedNumber[] = selectedNumbers.map(numberKey => {
      const numberData = allNumbers.find(n => `${n.number}-${n.digit_count}-${n.type_number}` === numberKey);
      if (numberData) {
        return {
          number: numberData.number,
          digit_count: numberData.digit_count,
          type_number: numberData.type_number,
          action,
          reason: `ความเสี่ยง ${formatPercentage(numberData.risk_percentage)}`,
          is_manual: false
        };
      }
      return null;
    }).filter(Boolean) as ManagedNumber[];

    setManagedNumbers(prev => {
        const existingKeys = new Set(prev.map(n => `${n.number}-${n.digit_count}-${n.type_number}`));
        const trulyNew = newManagedNumbers.filter(n => !existingKeys.has(`${n.number}-${n.digit_count}-${n.type_number}`));
        return [...prev, ...trulyNew];
    });

    setSelectedNumbers([]);
    toast.success(`เพิ่ม ${newManagedNumbers.length} เลขเข้าระบบจัดการเรียบร้อย`);
  };

  const addManualNumber = () => {
    if (!manualNumber.trim()) { toast.error('กรุณาใส่หมายเลข'); return; }
    const numberKey = `${manualNumber}-${manualDigitCount}-${manualTypeNumber}`;
    const exists = managedNumbers.some(n => `${n.number}-${n.digit_count}-${n.type_number}` === numberKey);
    if (exists) { toast.error('หมายเลขนี้มีอยู่ในระบบแล้ว'); return; }

    const newManagedNumber: ManagedNumber = { number: manualNumber, digit_count: manualDigitCount, type_number: manualTypeNumber, action: manualAction, reason: manualReason, is_manual: true };
    setManagedNumbers(prev => [...prev, newManagedNumber]);
    setManualNumber('');
    setShowManualAdd(false);
    toast.success('เพิ่มหมายเลขด้วยตนเองสำเร็จ');
  };

  const removeManagedNumber = (numberKey: string) => {
    setManagedNumbers(prev => prev.filter(n => `${n.number}-${n.digit_count}-${n.type_number}` !== numberKey));
    toast.success('ลบหมายเลขออกจากระบบจัดการแล้ว');
  };
  
  const clearManagedNumbers = () => {
      if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างรายการจัดการทั้งหมด?')) {
        setManagedNumbers([]);
        setSelectedNumbers([]);
        toast.success('ล้างรายการจัดการทั้งหมดแล้ว');
      }
  };

  const exportManagedNumbers = () => {
    if (managedNumbers.length === 0) { toast.error('ไม่มีรายการจัดการให้ส่งออก'); return; }
    const summary = managedNumbers.map(m => ({ หมายเลข: m.number, ประเภท: `${m.digit_count} ตัว${m.type_number}`, การจัดการ: m.action === 'half' ? 'หารครึ่ง' : 'ปิดรับ', เหตุผล: m.reason, ที่มา: m.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์' }));
    const csvContent = [ Object.keys(summary[0]).join(','), ...summary.map(row => Object.values(row).join(',')), ].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `รายการจัดการเลขอั้น_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('ส่งออกรายการจัดการเรียบร้อยแล้ว');
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
  const formatPercentage = (percentage: number) => percentage > 100 ? "100%+" : `${percentage.toFixed(1)}%`;
  const getRiskColor = (percentage: number) => {
    if (percentage > riskThreshold) return 'text-red-600 bg-red-50';
    if (percentage > riskThreshold / 2) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };
  const getRiskBadgeColor = (percentage: number) => {
    if (percentage > riskThreshold) return 'destructive';
    if (percentage > riskThreshold / 2) return 'secondary';
    return 'outline';
  };
  
  const handleActionDialog = () => {
    if (selectedNumbers.length === 0) { toast.warning("กรุณาเลือกตัวเลขที่ต้องการจัดการก่อน"); return; }
    setActionDialogOpen(true);
  };
  
  const handleSelectAction = (action: 'half' | 'close') => {
    addSelectedToManaged(action);
    setActionDialogOpen(false);
  };

  const renderNumberTable = (title: string, numbers: NumberSalesData[], icon: React.ReactNode, cardClass: string) => (
    numbers.length > 0 && (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title} ({numbers.length} เลข)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 w-8">เลือก</th>
                  <th className="text-left p-2">เลข</th>
                  <th className="text-left p-2">ประเภท</th>
                  <th className="text-right p-2">ยอดขาย</th>
                  <th className="text-right p-2">เงินรางวัล</th>
                  <th className="text-right p-2">ความเสี่ยง</th>
                  <th className="text-center p-2">จำนวนบิล</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((number, index) => {
                  const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
                  const isSelected = selectedNumbers.includes(numberKey);
                  const isManaged = managedNumbers.some(m => `${m.number}-${m.digit_count}-${m.type_number}` === numberKey);
                  return (
                    <tr key={index} className={`border-b hover:bg-opacity-50 ${isSelected ? 'bg-blue-100' : ''} ${isManaged ? 'opacity-40 bg-gray-100' : 'hover:bg-gray-50'}`}>
                      <td className="p-2">
                        <Checkbox checked={isSelected} disabled={isManaged} onCheckedChange={() => toggleNumberSelection(numberKey)} />
                      </td>
                      <td className="p-2 font-mono font-bold">{number.number}</td>
                      <td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                      <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(number.potential_payout)}</td>
                      <td className="p-2 text-right"><Badge variant={getRiskBadgeColor(number.risk_percentage)}>{formatPercentage(number.risk_percentage)}</Badge></td>
                      <td className="p-2 text-center">{number.total_bets}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  );

  return (
    <div className="p-4 bg-gray-50 min-h-[80vh] space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">วันที่ออกรางวัล:</label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" disabled={testMode || loading} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">เกณฑ์เลขอั้น (%):</label>
              <Input type="number" value={riskThreshold} onChange={(e) => setRiskThreshold(Number(e.target.value))} className="w-20" min="1" max="100" disabled={loading} />
            </div>
            <Button onClick={() => fetchSalesAnalysis()} disabled={loading || testMode}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              วิเคราะห์ใหม่
            </Button>
          </div>
          <div className="flex items-center gap-2">
              <Button onClick={() => setShowManualAdd(prev => !prev)} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มเลขด้วยตนเอง
              </Button>
              <Button onClick={() => { setTestMode(prev => !prev); if(testMode) { setAnalysis(null); setManagedNumbers([]); setSelectedNumbers([]); toast.info("ออกจากโหมดทดสอบ"); } else { generateSampleData(); } }} variant="outline" className={testMode ? "bg-orange-50 text-orange-700" : ""}>
                {testMode ? "ออกจากโหมดทดสอบ" : "ทดสอบ"}
              </Button>
          </div>
      </div>
      
      {testMode && <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg p-3 text-sm flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><span>กำลังแสดงข้อมูลตัวอย่างสำหรับทดสอบระบบ</span></div>}
      
      {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> <span className="ml-2">กำลังวิเคราะห์ข้อมูล...</span></div>}
      
      {!loading && analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">ยอดขายรวม</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.total_sales_all)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">อาจต้องจ่าย</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600">{formatCurrency(analysis.total_potential_payout)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">ความเสี่ยงรวม</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${analysis.overall_risk_percentage > riskThreshold ? 'text-red-600' : 'text-green-600'}`}>{formatPercentage(analysis.overall_risk_percentage)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">เลขอั้น</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{analysis.high_risk_numbers.length}</div><div className="text-xs text-gray-500">เลข</div></CardContent></Card>
          </div>
          
          {renderNumberTable('เลขอั้น - ควรจัดการด่วน', analysis.high_risk_numbers, <AlertTriangle className="h-5 w-5 text-red-600" />, 'border-red-200')}
          {renderNumberTable('เลขเสี่ยงปานกลาง - ควรติดตาม', analysis.medium_risk_numbers, <TrendingUp className="h-5 w-5 text-orange-600" />, 'border-orange-200')}
          {renderNumberTable('เลขปลอดภัย - ยอดขายสูงสุด', analysis.safe_numbers, <TrendingDown className="h-5 w-5 text-green-600" />, 'border-green-200')}

          {managedNumbers.length > 0 && (
            <Card className="border-green-200">
              <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><Settings className="h-5 w-5" />รายการจัดการ ({managedNumbers.length} เลข)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">หมายเลข</th><th className="text-left p-2">ประเภท</th><th className="text-left p-2">การจัดการ</th><th className="text-left p-2">เหตุผล</th><th className="text-left p-2">ที่มา</th><th className="text-center p-2">จัดการ</th></tr></thead>
                    <tbody>
                      {managedNumbers.map((managed, index) => (
                        <tr key={index} className="border-b hover:bg-green-50">
                          <td className="p-2 font-mono font-bold">{managed.number}</td>
                          <td className="p-2">{managed.digit_count} ตัว{managed.type_number}</td>
                          <td className="p-2"><Badge variant={managed.action === 'half' ? 'outline' : 'destructive'}>{managed.action === 'half' ? <><Scissors className="h-3 w-3 mr-1" />หารครึ่ง</> : <><Ban className="h-3 w-3 mr-1" />ปิดรับ</>}</Badge></td>
                          <td className="p-2 text-sm text-gray-600">{managed.reason}</td>
                          <td className="p-2"><Badge variant={managed.is_manual ? 'secondary' : 'outline'}>{managed.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์'}</Badge></td>
                          <td className="p-2 text-center"><Button size="sm" variant="ghost" onClick={() => removeManagedNumber(`${managed.number}-${managed.digit_count}-${managed.type_number}`)}>ลบ</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">รวม: หารครึ่ง {managedNumbers.filter(m => m.action === 'half').length} เลข, ปิดรับ {managedNumbers.filter(m => m.action === 'close').length} เลข</div>
                  <div className="flex gap-2"><Button onClick={exportManagedNumbers} variant="outline" size="sm">ส่งออก CSV</Button><Button onClick={clearManagedNumbers} variant="outline" size="sm">ล้างทั้งหมด</Button></div>
                </div>
              </CardContent>
            </Card>
          )}

          {!analysis.total_sales_all && <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลการขายในวันที่เลือก</div>}
        </>
      )}

      {selectedNumbers.length > 0 && (
        <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          <CardHeader><CardTitle className="text-lg flex justify-between items-center"><span>เลือก {selectedNumbers.length} รายการ</span><Button variant="ghost" size="sm" onClick={() => setSelectedNumbers([])}>ยกเลิก</Button></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2"><Button onClick={handleActionDialog} className="w-full"><Settings className="mr-2 h-4 w-4" />จัดการเลขที่เลือก</Button></CardContent>
        </Card>
      )}
      
      {showManualAdd && (
        <Card className="fixed bottom-4 left-4 w-[480px] shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          <CardHeader><CardTitle className="text-purple-600 flex items-center gap-2"><Plus className="h-5 w-5" />เพิ่มหมายเลขด้วยตนเอง (เลขดัง)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 items-end">
              <div><label className="text-xs font-medium">หมายเลข</label><Input placeholder="123" value={manualNumber} onChange={(e) => setManualNumber(e.target.value)} maxLength={4} /></div>
              <div><label className="text-xs font-medium">หลัก</label><Select value={manualDigitCount.toString()} onValueChange={(v) => setManualDigitCount(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">2 ตัว</SelectItem><SelectItem value="3">3 ตัว</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs font-medium">ประเภท</label><Select value={manualTypeNumber} onValueChange={(v) => setManualTypeNumber(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="บน">บน</SelectItem><SelectItem value="ล่าง">ล่าง</SelectItem><SelectItem value="โต๊ด">โต๊ด</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs font-medium">จัดการ</label><Select value={manualAction} onValueChange={(v: 'half'|'close') => setManualAction(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="half">หารครึ่ง</SelectItem><SelectItem value="close">ปิดรับ</SelectItem></SelectContent></Select></div>
              <Button onClick={addManualNumber}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="mt-2"><label className="text-xs font-medium">เหตุผล</label><Input placeholder="เช่น เลขดัง" value={manualReason} onChange={(e) => setManualReason(e.target.value)} /></div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>เลือกการกระทำสำหรับ {selectedNumbers.length} เลขที่เลือก</AlertDialogTitle><AlertDialogDescription>คุณต้องการ "หารครึ่ง" หรือ "ปิดรับ" สำหรับตัวเลขที่เลือกทั้งหมด? การกระทำนี้จะถูกบันทึกในตารางจัดการ</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleSelectAction('half')}><Scissors className="mr-2 h-4 w-4" />หารครึ่ง</Button>
            <Button variant="destructive" onClick={() => handleSelectAction('close')}><Ban className="mr-2 h-4 w-4" />ปิดรับ</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 