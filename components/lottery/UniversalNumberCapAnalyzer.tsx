"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Plus, Settings, Ban, Scissors, BarChart3, Users, Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useNumberCap } from '@/lib/contexts/NumberCapContext';
import { useNumberCapAnalysis } from './useNumberCapAnalysis';
import { NumberCapTable } from './NumberCapTable';

interface Props {
  lottery_sub_type_id: number;
  onClose: () => void;
}

interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  lottery_type_id: number;
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
  lottery_sub_type_id: number;
  draw_date: string;
  risk_percentage?: number;
}

export default function UniversalNumberCapAnalyzer({ lottery_sub_type_id, onClose }: Props) {
  const { managedNumbers, addManagedNumber, removeManagedNumber: removeManagedNumberFromContext, fetchManagedNumbers, updateManagedNumbersForSubType, checkNumberStatus } = useNumberCap();
  const [lotterySubType, setLotterySubType] = useState<LotterySubType | null>(null);
  // ฟังก์ชันแปลงวันที่ปัจจุบันเป็น yyyy-MM-dd (โซนเวลาไทย)
  function getTodayTH() {
    const now = new Date();
    now.setHours(now.getHours() + 7 - now.getTimezoneOffset() / 60);
    return now.toISOString().split('T')[0];
  }
  const [selectedDate, setSelectedDate] = useState(getTodayTH());
  const [riskThreshold, setRiskThreshold] = useState(70); // 70% risk threshold
  const { analysis, loading, fetchSalesAnalysis } = useNumberCapAnalysis(lottery_sub_type_id, selectedDate, riskThreshold);
  const [testMode, setTestMode] = useState(false); // Test mode with sample data
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [manualDigitCount, setManualDigitCount] = useState<number>(3);
  const [manualTypeNumber, setManualTypeNumber] = useState('บน');
  const [manualAction, setManualAction] = useState<'half' | 'close'>('half');
  const [manualReason, setManualReason] = useState('เลขดัง');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  function toThaiDateString(date: Date) {
    const tzOffset = 7 * 60 * 60 * 1000;
    const tzDate = new Date(date.getTime() + tzOffset);
    return tzDate.toISOString().split('T')[0];
  }

  // ล้าง manual number เมื่อเปลี่ยน digit count
  useEffect(() => {
    setManualNumber('');
  }, [manualDigitCount]);

  // Fetch lottery subtype information
  useEffect(() => {
    const fetchSubType = async () => {
      try {
        const { data, error } = await supabase
          .from('lottery_sub_types')
          .select('lottery_sub_type_id, sub_type_name, country_origin, lottery_type_id')
          .eq('lottery_sub_type_id', lottery_sub_type_id)
          .single();

        if (error) throw error;
        setLotterySubType(data);
      } catch (error) {
        console.error('Error fetching lottery subtype:', error);
        toast.error('ไม่สามารถดึงข้อมูลประเภทหวยได้');
      }
    };

    fetchSubType();
  }, [lottery_sub_type_id]);

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
    // Note: sampleAnalysis is for display only in test mode
    // The actual analysis comes from useNumberCapAnalysis hook
    const sampleManagedNumbers: ManagedNumber[] = [
      { number: "123", digit_count: 3, type_number: "บน", action: "close", reason: "ความเสี่ยง 100%+", is_manual: false, lottery_sub_type_id, draw_date: selectedDate },
      { number: "999", digit_count: 3, type_number: "บน", action: "half", reason: "เลขดัง", is_manual: true, lottery_sub_type_id, draw_date: selectedDate },
      { number: "456", digit_count: 3, type_number: "โต๊ด", action: "half", reason: "ความเสี่ยง 96.0%", is_manual: false, lottery_sub_type_id, draw_date: selectedDate }
    ];
    // setManagedNumbers(sampleManagedNumbers); // This line is removed as managedNumbers is now from context
    toast.success("✅ แสดงข้อมูลตัวอย่างสำหรับทดสอบ", { duration: 3000 });
  };

  // fetchSalesAnalysis is now provided by useNumberCapAnalysis hook

  useEffect(() => {
    if (!testMode) {
      fetchSalesAnalysis();
    }
  }, [selectedDate, riskThreshold, testMode, lottery_sub_type_id, fetchSalesAnalysis]);

  // Load managed numbers from Context when component mounts
  useEffect(() => {
    fetchManagedNumbers(lottery_sub_type_id, selectedDate);
  }, [lottery_sub_type_id, selectedDate, fetchManagedNumbers]);

  // ลบ useEffect ที่ทำให้เกิด infinite loop
  // ไม่ต้อง sync managedNumbers อัตโนมัติเพราะทำให้เกิด infinite loop
  // const syncManagedNumbers = async () => {
  //   if (managedNumbers.length > 0) {
  //     const numbersWithContext = managedNumbers.map(n => ({
  //       ...n,
  //       lottery_sub_type_id,
  //       draw_date: selectedDate
  //     }));
  //     await updateManagedNumbersForSubType(lottery_sub_type_id, selectedDate, numbersWithContext);
  //   }
  // };

  const toggleNumberSelection = (numberKey: string) => {
    setSelectedNumbers(prev => prev.includes(numberKey) ? prev.filter(key => key !== numberKey) : [...prev, numberKey]);
  };
  
  const addSelectedToManaged = async (action: 'half' | 'close') => {
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
          is_manual: false,
          lottery_sub_type_id,
          draw_date: selectedDate,
          risk_percentage: numberData.risk_percentage
        };
      }
      return null;
    }).filter(Boolean) as ManagedNumber[];

    try {
      for (const newManagedNumber of newManagedNumbers) {
        await addManagedNumber(newManagedNumber);
      }
      setSelectedNumbers([]);
      toast.success(`เพิ่ม ${newManagedNumbers.length} เลขเข้าระบบจัดการเรียบร้อย`);
    } catch (error) {
      console.error('Error adding managed numbers:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มเลขอั้น');
    }
  };

  const addManualNumber = async () => {
    if (!manualNumber.trim()) { toast.error('กรุณาใส่หมายเลข'); return; }
    
    // ตรวจสอบความยาวของเลขให้ตรงกับจำนวนหลักที่เลือก
    if (manualNumber.length !== manualDigitCount) {
      toast.error(`กรุณาใส่เลข ${manualDigitCount} หลัก`);
      return;
    }

    // ตรวจสอบว่าเป็นตัวเลขเท่านั้น
    if (!/^\d+$/.test(manualNumber)) {
      toast.error('กรุณาใส่เฉพาะตัวเลขเท่านั้น');
      return;
    }

    const numberKey = `${manualNumber}-${manualDigitCount}-${manualTypeNumber}`;
    const exists = managedNumbers.some(n => `${n.number}-${n.digit_count}-${n.type_number}` === numberKey);
    if (exists) { toast.error('หมายเลขนี้มีอยู่ในระบบแล้ว'); return; }

    const newManagedNumber: ManagedNumber = { number: manualNumber, digit_count: manualDigitCount, type_number: manualTypeNumber, action: manualAction, reason: manualReason, is_manual: true, lottery_sub_type_id, draw_date: selectedDate };
    
    try {
      await addManagedNumber(newManagedNumber);
      setManualNumber('');
      setShowManualAdd(false);
      toast.success('เพิ่มหมายเลขด้วยตนเองสำเร็จ');
    } catch (error) {
      console.error('Error adding manual number:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มเลขอั้น');
    }
  };

  const clearManagedNumbers = async () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างรายการจัดการทั้งหมด?')) {
      try {
        // ลบข้อมูลใน supabase
        const { error } = await supabase
          .from('managed_numbers')
          .delete()
          .eq('lottery_sub_type_id', lottery_sub_type_id)
          .eq('draw_date', selectedDate);
        if (error) throw error;
        // รีเฟรช context
        await fetchManagedNumbers(lottery_sub_type_id, selectedDate);
        toast.success('ล้างรายการจัดการทั้งหมดแล้ว');
      } catch (err) {
        console.error('เกิดข้อผิดพลาดในการลบทั้งหมด:', err);
        toast.error('เกิดข้อผิดพลาดในการลบทั้งหมด');
      }
    }
  };

  const exportManagedNumbers = () => {
    if (managedNumbers.length === 0) { toast.error('ไม่มีรายการจัดการให้ส่งออก'); return; }
    const summary = managedNumbers.map(m => ({ หมายเลข: m.number, ประเภท: `${m.digit_count} ตัว${m.type_number}`, การจัดการ: m.action === 'half' ? 'หารครึ่ง' : 'ปิดรับ', เหตุผล: m.reason, ที่มา: m.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์' }));
    const csvContent = [ Object.keys(summary[0]).join(','), ...summary.map(row => Object.values(row).join(',')), ].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `รายการจัดการเลขอั้น_${lotterySubType?.sub_type_name}_${selectedDate}.csv`;
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
  
  const handleSelectAction = async (action: 'half' | 'close') => {
    await addSelectedToManaged(action);
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

  const filteredManagedNumbers = managedNumbers.filter(n => n.lottery_sub_type_id === lottery_sub_type_id && n.draw_date === selectedDate);

  return (
    <div className="p-4 bg-gray-50 min-h-[80vh] space-y-4">
      {/* Header with lottery type info */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ระบบจัดการเลขอั้น</h1>
              <p className="text-sm text-gray-600">
                {lotterySubType?.sub_type_name} • {lotterySubType?.country_origin}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium">วันที่ออกรางวัล:</label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" disabled={testMode || loading} />
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <label className="text-sm font-medium">เกณฑ์เลขอั้น (%):</label>
              <Input type="number" value={riskThreshold} onChange={(e) => setRiskThreshold(Number(e.target.value))} className="w-20" min="1" max="100" disabled={loading} />
            </div>
            <Button onClick={() => {
              console.log('🔄 UniversalNumberCapAnalyzer วิเคราะห์ใหม่ button clicked, testMode:', testMode);
              if (!testMode) {
                fetchSalesAnalysis();
              }
            }} disabled={loading || testMode}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              วิเคราะห์ใหม่
            </Button>
          </div>
          <div className="flex items-center gap-2">
              <Button onClick={() => setShowManualAdd(prev => !prev)} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มเลขด้วยตนเอง
              </Button>
              <Button onClick={() => { setTestMode(prev => !prev); if(testMode) { 
                setSelectedNumbers([]); toast.info("ออกจากโหมดทดสอบ"); } else { generateSampleData(); } }} variant="outline" className={testMode ? "bg-orange-50 text-orange-700" : ""}>
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

          {filteredManagedNumbers.length > 0 && (
            <Card className="border-green-200">
              <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><Settings className="h-5 w-5" />รายการจัดการ ({filteredManagedNumbers.length} เลข)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">หมายเลข</th><th className="text-left p-2">ประเภท</th><th className="text-left p-2">การจัดการ</th><th className="text-left p-2">เหตุผล</th><th className="text-left p-2">ที่มา</th><th className="text-center p-2">จัดการ</th></tr></thead>
                    <tbody>
                      {filteredManagedNumbers.map((managed, index) => (
                        <tr key={index} className="border-b hover:bg-green-50">
                          <td className="p-2 font-mono font-bold">{managed.number}</td>
                          <td className="p-2">{managed.digit_count} ตัว{managed.type_number}</td>
                          <td className="p-2"><Badge variant={managed.action === 'half' ? 'outline' : 'destructive'}>{managed.action === 'half' ? <><Scissors className="h-3 w-3 mr-1" />หารครึ่ง</> : <><Ban className="h-3 w-3 mr-1" />ปิดรับ</>}</Badge></td>
                          <td className="p-2 text-sm text-gray-600">{managed.reason}</td>
                          <td className="p-2"><Badge variant={managed.is_manual ? 'secondary' : 'outline'}>{managed.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์'}</Badge></td>
                          <td className="p-2 text-center"><Button size="sm" variant="ghost" onClick={() => removeManagedNumberFromContext(`${managed.number}-${managed.digit_count}-${managed.type_number}`)}>ลบ</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">รวม: หารครึ่ง {filteredManagedNumbers.filter(m => m.action === 'half').length} เลข, ปิดรับ {filteredManagedNumbers.filter(m => m.action === 'close').length} เลข</div>
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
              <div><label className="text-xs font-medium">หมายเลข ({manualDigitCount} หลัก)</label><Input placeholder={`เช่น ${'1'.repeat(manualDigitCount)}`} value={manualNumber} onChange={(e) => {
                const value = e.target.value;
                // อนุญาตเฉพาะตัวเลขและจำกัดความยาวตาม digit count
                if (/^\d*$/.test(value) && value.length <= manualDigitCount) {
                  setManualNumber(value);
                }
              }} maxLength={manualDigitCount} /></div>
              <div><label className="text-xs font-medium">หลัก</label><Select value={manualDigitCount.toString()} onValueChange={(v) => setManualDigitCount(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 ตัว</SelectItem><SelectItem value="2">2 ตัว</SelectItem><SelectItem value="3">3 ตัว</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs font-medium">ประเภท</label><Select value={manualTypeNumber} onValueChange={(v) => setManualTypeNumber(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="บน">บน</SelectItem><SelectItem value="ล่าง">ล่าง</SelectItem><SelectItem value="โต๊ด">โต๊ด</SelectItem><SelectItem value="วิ่งบน">วิ่งบน</SelectItem><SelectItem value="วิ่งล่าง">วิ่งล่าง</SelectItem></SelectContent></Select></div>
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