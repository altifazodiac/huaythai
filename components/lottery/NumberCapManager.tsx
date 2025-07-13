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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  // Manual add states
  const [quickAddDialog, setQuickAddDialog] = useState(false);
  const [quickAddNumber, setQuickAddNumber] = useState<NumberSalesData | null>(null);

  // Generate sample data for testing
  const generateSampleData = () => {
    const sampleAnalysis: SalesAnalysis = {
      total_sales_all: 125000,
      total_potential_payout: 95000,
      overall_risk_percentage: 76.0,
      high_risk_numbers: [
        {
          number: "123",
          digit_count: 3,
          type_number: "บน",
          total_sales: 1500,
          price_paid: 900,
          potential_payout: 1350000,
          risk_percentage: 100.0,
          is_capped: true,
          total_bets: 15
        },
        {
          number: "456",
          digit_count: 3,
          type_number: "โต๊ด",
          total_sales: 800,
          price_paid: 150,
          potential_payout: 120000,
          risk_percentage: 96.0,
          is_capped: true,
          total_bets: 8
        },
        {
          number: "12",
          digit_count: 2,
          type_number: "ล่าง",
          total_sales: 1200,
          price_paid: 90,
          potential_payout: 108000,
          risk_percentage: 86.4,
          is_capped: true,
          total_bets: 24
        },
        {
          number: "78",
          digit_count: 2,
          type_number: "บน",
          total_sales: 1000,
          price_paid: 95,
          potential_payout: 95000,
          risk_percentage: 76.0,
          is_capped: true,
          total_bets: 20
        }
      ],
      medium_risk_numbers: [
        {
          number: "789",
          digit_count: 3,
          type_number: "บน",
          total_sales: 600,
          price_paid: 900,
          potential_payout: 540000,
          risk_percentage: 43.2,
          is_capped: false,
          total_bets: 6
        },
        {
          number: "34",
          digit_count: 2,
          type_number: "ล่าง",
          total_sales: 500,
          price_paid: 90,
          potential_payout: 45000,
          risk_percentage: 36.0,
          is_capped: false,
          total_bets: 10
        },
        {
          number: "56",
          digit_count: 2,
          type_number: "บน",
          total_sales: 400,
          price_paid: 95,
          potential_payout: 38000,
          risk_percentage: 30.4,
          is_capped: false,
          total_bets: 8
        }
      ],
      safe_numbers: [
        {
          number: "001",
          digit_count: 3,
          type_number: "บน",
          total_sales: 300,
          price_paid: 900,
          potential_payout: 270000,
          risk_percentage: 21.6,
          is_capped: false,
          total_bets: 3
        },
        {
          number: "56",
          digit_count: 2,
          type_number: "ล่าง",
          total_sales: 200,
          price_paid: 90,
          potential_payout: 18000,
          risk_percentage: 14.4,
          is_capped: false,
          total_bets: 4
        }
      ]
    };
    
    setAnalysis(sampleAnalysis);
    
    // เพิ่มข้อมูลตัวอย่างสำหรับรายการจัดการด้วย
    const sampleManagedNumbers: ManagedNumber[] = [
      {
        number: "123",
        digit_count: 3,
        type_number: "บน",
        action: "close",
        reason: "ความเสี่ยง 100%+",
        is_manual: false
      },
      {
        number: "999",
        digit_count: 3,
        type_number: "บน",
        action: "half",
        reason: "เลขดัง",
        is_manual: true
      },
      {
        number: "456",
        digit_count: 3,
        type_number: "โต๊ด",
        action: "half",
        reason: "ความเสี่ยง 96.0%",
        is_manual: false
      }
    ];
    
    setManagedNumbers(sampleManagedNumbers);
    toast.success("✅ แสดงข้อมูลตัวอย่างสำหรับทดสอบ", { duration: 3000 });
  };

  // Fetch sales data and calculate risks
  const fetchSalesAnalysis = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      console.log('Fetching sales data for date:', selectedDate);
      
      // 1. Get all ticket sales for the selected date - simplified query first
      const { data: salesData, error: salesError } = await supabase
        .from('lottery_tickets')
        .select(`
          total_amount,
          lottery_ticket_items!inner (
            numbers,
            amount,
            lottery_sub_type_id,
            lottery_sub_number_id
          )
        `)
        .eq('draw_date', selectedDate)
        .eq('status', 'confirmed');

      if (salesError) {
        console.error('Sales query error:', salesError);
        throw new Error(`Database error: ${salesError.message || 'Unknown error'}`);
      }

      console.log('Sales data:', salesData);

      // 2. Get payout rules for government lottery
      const { data: payoutRules, error: payoutError } = await supabase
        .from('lottery_sub_number')
        .select('*')
        .eq('lottery_sub_type_id', lottery_sub_type_id);

      if (payoutError) {
        console.error('Payout rules error:', payoutError);
        throw new Error(`Payout rules error: ${payoutError.message || 'Unknown error'}`);
      }

      console.log('Payout rules:', payoutRules);

      // 3. Check if we have data
      if (!salesData || salesData.length === 0) {
        console.log('No sales data found for date:', selectedDate);
        setAnalysis({
          total_sales_all: 0,
          total_potential_payout: 0,
          overall_risk_percentage: 0,
          high_risk_numbers: [],
          medium_risk_numbers: [],
          safe_numbers: []
        });
        return;
      }

      // 4. Create payout rules lookup
      const payoutRulesMap: Record<number, any> = {};
      payoutRules?.forEach(rule => {
        payoutRulesMap[rule.id] = rule;
      });

      // 5. Process and analyze the data
      const numberSalesMap: Record<string, NumberSalesData> = {};
      let totalSalesAll = 0;

      // Process each ticket
      salesData.forEach(ticket => {
        totalSalesAll += Number(ticket.total_amount || 0);
        
        ticket.lottery_ticket_items?.forEach(item => {
          const payoutRule = payoutRulesMap[item.lottery_sub_number_id];
          
          // Skip if no payout rule found
          if (!payoutRule) return;
          
          item.numbers?.forEach(number => {
            const key = `${number}-${payoutRule.digit_number}-${payoutRule.type_number}`;
            
            if (!numberSalesMap[key]) {
              numberSalesMap[key] = {
                number,
                digit_count: payoutRule.digit_number,
                type_number: payoutRule.type_number,
                total_sales: 0,
                price_paid: Number(payoutRule.price_paid || 0),
                potential_payout: 0,
                risk_percentage: 0,
                is_capped: false,
                total_bets: 0
              };
            }
            
            const sales = Number(item.amount || 0);
            numberSalesMap[key].total_sales += sales;
            numberSalesMap[key].total_bets += 1;
            numberSalesMap[key].potential_payout = numberSalesMap[key].total_sales * numberSalesMap[key].price_paid;
          });
        });
      });

      // 6. Calculate risk percentages after processing all data
      Object.values(numberSalesMap).forEach(numberData => {
        numberData.risk_percentage = totalSalesAll > 0 
          ? (numberData.potential_payout / totalSalesAll) * 100 
          : 0;
        numberData.is_capped = numberData.risk_percentage > riskThreshold;
      });

      // 7. Categorize numbers by risk level
      const allNumbers = Object.values(numberSalesMap);
      const highRiskNumbers = allNumbers.filter(n => n.risk_percentage > riskThreshold);
      const mediumRiskNumbers = allNumbers.filter(n => n.risk_percentage > 30 && n.risk_percentage <= riskThreshold);
      const safeNumbers = allNumbers.filter(n => n.risk_percentage <= 30);

      const totalPotentialPayout = allNumbers.reduce((sum, n) => sum + n.potential_payout, 0);
      const overallRiskPercentage = totalSalesAll > 0 ? (totalPotentialPayout / totalSalesAll) * 100 : 0;

      console.log('Analysis results:', {
        totalSalesAll,
        totalPotentialPayout,
        overallRiskPercentage,
        highRiskCount: highRiskNumbers.length,
        mediumRiskCount: mediumRiskNumbers.length,
        safeCount: safeNumbers.length
      });

      setAnalysis({
        total_sales_all: totalSalesAll,
        total_potential_payout: totalPotentialPayout,
        overall_risk_percentage: overallRiskPercentage,
        high_risk_numbers: highRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        medium_risk_numbers: mediumRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        safe_numbers: safeNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage)
      });

      // Show toast notification
      if (highRiskNumbers.length > 0) {
        toast.warning(`⚠️ พบเลขอั้น ${highRiskNumbers.length} เลข ควรหารครึ่งหรือปิดรับ`, {
          duration: 4000,
        });
      } else {
        toast.success(`✅ ไม่พบเลขอั้น ความเสี่ยงอยู่ในระดับปกติ`, {
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Error fetching sales analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล';
      toast.error(errorMessage);
      
      // Set empty analysis on error
      setAnalysis({
        total_sales_all: 0,
        total_potential_payout: 0,
        overall_risk_percentage: 0,
        high_risk_numbers: [],
        medium_risk_numbers: [],
        safe_numbers: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when date changes
  useEffect(() => {
    fetchSalesAnalysis();
  }, [selectedDate, riskThreshold]);

  // Toggle number selection
  const toggleNumberSelection = (numberKey: string) => {
    setSelectedNumbers(prev => 
      prev.includes(numberKey) 
        ? prev.filter(key => key !== numberKey)
        : [...prev, numberKey]
    );
  };

  // Add selected numbers to managed list
  const addSelectedToManaged = (action: 'half' | 'close') => {
    if (selectedNumbers.length === 0) {
      toast.error('กรุณาเลือกหมายเลขก่อน');
      return;
    }

    const allNumbers = [
      ...(analysis?.high_risk_numbers || []),
      ...(analysis?.medium_risk_numbers || []),
      ...(analysis?.safe_numbers || [])
    ];

    const newManagedNumbers: ManagedNumber[] = selectedNumbers.map(numberKey => {
      const number = allNumbers.find(n => `${n.number}-${n.digit_count}-${n.type_number}` === numberKey);
      return {
        number: number?.number || '',
        digit_count: number?.digit_count || 3,
        type_number: number?.type_number || 'บน',
        action,
        reason: `ความเสี่ยง ${number?.risk_percentage.toFixed(1)}%`,
        is_manual: false
      };
    });

    setManagedNumbers(prev => {
      const filtered = prev.filter(existing => 
        !selectedNumbers.includes(`${existing.number}-${existing.digit_count}-${existing.type_number}`)
      );
      return [...filtered, ...newManagedNumbers];
    });

    setSelectedNumbers([]);
    toast.success(`เพิ่มเลข ${selectedNumbers.length} เลขเข้าระบบจัดการแล้ว`);
  };

  // Add manual number
  const addManualNumber = () => {
    if (!manualNumber.trim()) {
      toast.error('กรุณาใส่หมายเลข');
      return;
    }

    const numberKey = `${manualNumber}-${manualDigitCount}-${manualTypeNumber}`;
    const exists = managedNumbers.some(n => 
      `${n.number}-${n.digit_count}-${n.type_number}` === numberKey
    );

    if (exists) {
      toast.error('หมายเลขนี้มีอยู่ในระบบแล้ว');
      return;
    }

    const newManagedNumber: ManagedNumber = {
      number: manualNumber,
      digit_count: manualDigitCount,
      type_number: manualTypeNumber,
      action: manualAction,
      reason: manualReason,
      is_manual: true
    };

    setManagedNumbers(prev => [...prev, newManagedNumber]);
    setManualNumber('');
    setShowManualAdd(false);
    toast.success('เพิ่มหมายเลขด้วยตนเองสำเร็จ');
  };

  // Remove managed number
  const removeManagedNumber = (numberKey: string) => {
    setManagedNumbers(prev => 
      prev.filter(n => `${n.number}-${n.digit_count}-${n.type_number}` !== numberKey)
    );
    toast.success('ลบหมายเลขออกจากระบบจัดการแล้ว');
  };

  // Clear all managed numbers
  const clearManagedNumbers = () => {
    setManagedNumbers([]);
    setSelectedNumbers([]);
    toast.success('ล้างรายการจัดการทั้งหมดแล้ว');
  };

  // Export managed numbers summary
  const exportManagedNumbers = () => {
    if (managedNumbers.length === 0) {
      toast.error('ไม่มีรายการจัดการให้ส่งออก');
      return;
    }

    const summary = managedNumbers.map(m => ({
      หมายเลข: m.number,
      ประเภท: `${m.digit_count} ตัว${m.type_number}`,
      การจัดการ: m.action === 'half' ? 'หารครึ่ง' : 'ปิดรับ',
      เหตุผล: m.reason,
      ที่มา: m.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์'
    }));

    const csvContent = [
      Object.keys(summary[0]).join(','),
      ...summary.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `รายการจัดการเลขอั้น_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ส่งออกรายการจัดการเรียบร้อยแล้ว');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    // จำกัดเปอร์เซ็นต์ให้แสดงสูงสุดแค่ 100%
    if (percentage > 100) {
      return "100%+";
    }
    return `${percentage.toFixed(1)}%`;
  };

  const getRiskColor = (percentage: number) => {
    if (percentage > riskThreshold) return 'text-red-600 bg-red-50';
    if (percentage > 30) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskBadgeColor = (percentage: number) => {
    if (percentage > riskThreshold) return 'destructive';
    if (percentage > 30) return 'outline';
    return 'secondary';
  };

  const addQuickNumber = (number: NumberSalesData, action: 'half' | 'close') => {
    const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
    
    // Check if already managed
    const existingIndex = managedNumbers.findIndex(m => 
      `${m.number}-${m.digit_count}-${m.type_number}` === numberKey
    );
    
    if (existingIndex !== -1) {
      toast.error('หมายเลขนี้ถูกจัดการแล้ว');
      return;
    }
    
    const newManagedNumber: ManagedNumber = {
      number: number.number,
      digit_count: number.digit_count,
      type_number: number.type_number,
      action: action,
      reason: action === 'half' ? 'หารครึ่ง - เลขเสี่ยงจากการวิเคราะห์' : 'ปิดรับ - เลขเสี่ยงจากการวิเคราะห์',
      is_manual: false
    };
    
    setManagedNumbers(prev => [...prev, newManagedNumber]);
    setQuickAddDialog(false);
    setQuickAddNumber(null);
    
    toast.success(`✅ เพิ่มหมายเลข ${number.number} (${action === 'half' ? 'หารครึ่ง' : 'ปิดรับ'}) เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">วันที่ออกรางวัล:</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
            disabled={testMode}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">เกณฑ์เลขอั้น:</label>
          <Input
            type="number"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(Number(e.target.value))}
            className="w-20"
            min="1"
            max="100"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSalesAnalysis} disabled={loading || testMode}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            วิเคราะห์ใหม่
          </Button>
          <Button 
            onClick={() => {
              if (testMode) {
                setTestMode(false);
                setAnalysis(null);
                setManagedNumbers([]);
                setSelectedNumbers([]);
                toast.info("ออกจากโหมดทดสอบ");
              } else {
                setTestMode(true);
                generateSampleData();
              }
            }}
            variant="outline"
            className={testMode ? "bg-orange-50 text-orange-700" : ""}
          >
            {testMode ? "ออกจากโหมดทดสอบ" : "ทดสอบด้วยข้อมูลตัวอย่าง"}
          </Button>
        </div>
      </div>

      {/* Test Mode Warning */}
      {testMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-700 font-medium">โหมดทดสอบ</span>
          </div>
          <p className="text-orange-600 text-sm mt-1">
            กำลังแสดงข้อมูลตัวอย่างสำหรับทดสอบระบบ ไม่ใช่ข้อมูลจริงจากฐานข้อมูล
          </p>
          <div className="text-orange-600 text-xs mt-2">
            💡 วิธีใช้: ✅ เลือกเลขจากตาราง → 📋 กำหนดการจัดการ → 📊 ดูสรุปรายการ → 📤 ส่งออกข้อมูล
          </div>
        </div>
      )}

              {analysis && (
          <>
            {/* Selection Controls */}
            {selectedNumbers.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-700 text-sm">เลือกแล้ว {selectedNumbers.length} เลข</CardTitle>
                  <div className="text-xs text-blue-600 mt-1">
                    เลือกการจัดการสำหรับเลขที่เลือก: หารครึ่ง (ลดอัตราจ่าย 50%) หรือ ปิดรับ (ไม่รับแทง)
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={() => addSelectedToManaged('half')}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Scissors className="h-4 w-4 mr-1" />
                      หารครึ่ง
                    </Button>
                    <Button 
                      onClick={() => addSelectedToManaged('close')}
                      size="sm"
                      variant="destructive"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      ปิดรับ
                    </Button>
                    <Button 
                      onClick={() => setSelectedNumbers([])}
                      size="sm"
                      variant="outline"
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ยอดขายรวม</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(analysis.total_sales_all)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">เงินรางวัลที่อาจจ่าย</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(analysis.total_potential_payout)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ความเสี่ยงรวม</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analysis.overall_risk_percentage > riskThreshold ? 'text-red-600' : 'text-green-600'}`}>
                  {formatPercentage(analysis.overall_risk_percentage)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">เลขอั้น</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analysis.high_risk_numbers.length}
                </div>
                <div className="text-xs text-gray-500">เลข</div>
              </CardContent>
            </Card>
          </div>

          {/* High Risk Numbers (เลขอั้น) */}
          {analysis.high_risk_numbers.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  เลขอั้น - ควรหารครึ่งหรือปิดรับ ({analysis.high_risk_numbers.length} เลข)
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
                        <th className="text-right p-2">อัตราจ่าย</th>
                        <th className="text-right p-2">เงินรางวัล</th>
                        <th className="text-right p-2">ความเสี่ยง</th>
                        <th className="text-center p-2">จำนวนเสียง</th>
                        <th className="text-center p-2">เพิ่ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.high_risk_numbers.map((number, index) => {
                        const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
                        const isSelected = selectedNumbers.includes(numberKey);
                        const isManaged = managedNumbers.some(m => `${m.number}-${m.digit_count}-${m.type_number}` === numberKey);
                        
                        return (
                          <tr key={index} className={`border-b hover:bg-red-50 ${isSelected ? 'bg-blue-50' : ''} ${isManaged ? 'opacity-50' : ''}`}>
                            <td className="p-2">
                              <Checkbox
                                checked={isSelected}
                                disabled={isManaged}
                                onCheckedChange={() => toggleNumberSelection(numberKey)}
                              />
                            </td>
                            <td className="p-2 font-mono font-bold">{number.number}</td>
                            <td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                            <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td>
                            <td className="p-2 text-right">{formatCurrency(number.price_paid)}</td>
                            <td className="p-2 text-right font-bold text-red-600">{formatCurrency(number.potential_payout)}</td>
                            <td className="p-2 text-right">
                              <Badge variant={getRiskBadgeColor(number.risk_percentage)}>
                                {formatPercentage(number.risk_percentage)}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">{number.total_bets}</td>
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isManaged}
                                onClick={() => {
                                  setQuickAddNumber(number);
                                  setQuickAddDialog(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medium Risk Numbers */}
          {analysis.medium_risk_numbers.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  เลขเสี่ยงปานกลาง - ควรติดตาม ({analysis.medium_risk_numbers.length} เลข)
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
                        <th className="text-right p-2">อัตราจ่าย</th>
                        <th className="text-right p-2">เงินรางวัล</th>
                        <th className="text-right p-2">ความเสี่ยง</th>
                        <th className="text-center p-2">จำนวนเสียง</th>
                        <th className="text-center p-2">เพิ่ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.medium_risk_numbers.slice(0, 10).map((number, index) => {
                        const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
                        const isSelected = selectedNumbers.includes(numberKey);
                        const isManaged = managedNumbers.some(m => `${m.number}-${m.digit_count}-${m.type_number}` === numberKey);
                        
                        return (
                          <tr key={index} className={`border-b hover:bg-orange-50 ${isSelected ? 'bg-blue-50' : ''} ${isManaged ? 'opacity-50' : ''}`}>
                            <td className="p-2">
                              <Checkbox
                                checked={isSelected}
                                disabled={isManaged}
                                onCheckedChange={() => toggleNumberSelection(numberKey)}
                              />
                            </td>
                            <td className="p-2 font-mono font-bold">{number.number}</td>
                            <td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                            <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td>
                            <td className="p-2 text-right">{formatCurrency(number.price_paid)}</td>
                            <td className="p-2 text-right font-bold text-orange-600">{formatCurrency(number.potential_payout)}</td>
                            <td className="p-2 text-right">
                              <Badge variant={getRiskBadgeColor(number.risk_percentage)}>
                                {formatPercentage(number.risk_percentage)}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">{number.total_bets}</td>
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isManaged}
                                onClick={() => {
                                  setQuickAddNumber(number);
                                  setQuickAddDialog(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {analysis.medium_risk_numbers.length > 10 && (
                  <div className="text-center mt-4 text-sm text-gray-500">
                    ... และอีก {analysis.medium_risk_numbers.length - 10} เลข
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Safe Numbers (Top 10) */}
          {analysis.safe_numbers.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  เลขปลอดภัย - ยอดขายสูงสุด ({analysis.safe_numbers.length} เลข)
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
                        <th className="text-right p-2">อัตราจ่าย</th>
                        <th className="text-right p-2">เงินรางวัล</th>
                        <th className="text-right p-2">ความเสี่ยง</th>
                        <th className="text-center p-2">จำนวนเสียง</th>
                        <th className="text-center p-2">เพิ่ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.safe_numbers.slice(0, 10).map((number, index) => {
                        const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
                        const isSelected = selectedNumbers.includes(numberKey);
                        const isManaged = managedNumbers.some(m => `${m.number}-${m.digit_count}-${m.type_number}` === numberKey);
                        
                        return (
                          <tr key={index} className={`border-b hover:bg-green-50 ${isSelected ? 'bg-blue-50' : ''} ${isManaged ? 'opacity-50' : ''}`}>
                            <td className="p-2">
                              <Checkbox
                                checked={isSelected}
                                disabled={isManaged}
                                onCheckedChange={() => toggleNumberSelection(numberKey)}
                              />
                            </td>
                            <td className="p-2 font-mono font-bold">{number.number}</td>
                            <td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                            <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td>
                            <td className="p-2 text-right">{formatCurrency(number.price_paid)}</td>
                            <td className="p-2 text-right font-bold text-green-600">{formatCurrency(number.potential_payout)}</td>
                            <td className="p-2 text-right">
                              <Badge variant={getRiskBadgeColor(number.risk_percentage)}>
                                {formatPercentage(number.risk_percentage)}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">{number.total_bets}</td>
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isManaged}
                                onClick={() => {
                                  setQuickAddNumber(number);
                                  setQuickAddDialog(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {analysis.safe_numbers.length > 10 && (
                  <div className="text-center mt-4 text-sm text-gray-500">
                    ... และอีก {analysis.safe_numbers.length - 10} เลข
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Add Section */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-600 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                เพิ่มหมายเลขด้วยตนเอง (เลขดัง)
              </CardTitle>
              <div className="text-sm text-gray-500">
                เพิ่มเลขที่ต้องการจัดการแม้ไม่ปรากฏในผลวิเคราะห์ เช่น เลขดัง หรือเลขที่ต้องการควบคุมพิเศษ
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">หมายเลข</label>
                    <Input
                      placeholder="เช่น 123"
                      value={manualNumber}
                      onChange={(e) => setManualNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addManualNumber();
                        }
                      }}
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">จำนวนหลัก</label>
                    <Select value={manualDigitCount.toString()} onValueChange={(value) => setManualDigitCount(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 ตัว</SelectItem>
                        <SelectItem value="3">3 ตัว</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">ประเภท</label>
                    <Select value={manualTypeNumber} onValueChange={setManualTypeNumber}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="บน">บน</SelectItem>
                        <SelectItem value="ล่าง">ล่าง</SelectItem>
                        <SelectItem value="โต๊ด">โต๊ด</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">การจัดการ</label>
                    <Select value={manualAction} onValueChange={(value: 'half' | 'close') => setManualAction(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="half">หารครึ่ง</SelectItem>
                        <SelectItem value="close">ปิดรับ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">เหตุผล</label>
                    <Input
                      placeholder="เช่น เลขดัง"
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={addManualNumber} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มหมายเลข
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Managed Numbers Summary */}
          {managedNumbers.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  รายการจัดการ ({managedNumbers.length} เลข)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">หมายเลข</th>
                        <th className="text-left p-2">ประเภท</th>
                        <th className="text-left p-2">การจัดการ</th>
                        <th className="text-left p-2">เหตุผล</th>
                        <th className="text-left p-2">ที่มา</th>
                        <th className="text-center p-2">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managedNumbers.map((managed, index) => (
                        <tr key={index} className="border-b hover:bg-green-50">
                          <td className="p-2 font-mono font-bold">{managed.number}</td>
                          <td className="p-2">{managed.digit_count} ตัว{managed.type_number}</td>
                          <td className="p-2">
                            <Badge variant={managed.action === 'half' ? 'outline' : 'destructive'}>
                              {managed.action === 'half' ? (
                                <><Scissors className="h-3 w-3 mr-1" />หารครึ่ง</>
                              ) : (
                                <><Ban className="h-3 w-3 mr-1" />ปิดรับ</>
                              )}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-gray-600">{managed.reason}</td>
                          <td className="p-2">
                            <Badge variant={managed.is_manual ? 'secondary' : 'outline'}>
                              {managed.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์'}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeManagedNumber(`${managed.number}-${managed.digit_count}-${managed.type_number}`)}
                            >
                              ลบ
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    รวม: หารครึ่ง {managedNumbers.filter(m => m.action === 'half').length} เลข, 
                    ปิดรับ {managedNumbers.filter(m => m.action === 'close').length} เลข
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportManagedNumbers} variant="outline" size="sm">
                      ส่งออก CSV
                    </Button>
                    <Button onClick={clearManagedNumbers} variant="outline" size="sm">
                      ล้างทั้งหมด
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={onClose} variant="outline">
              ปิด
            </Button>
            <Button onClick={fetchSalesAnalysis} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              รีเฟรชข้อมูล
            </Button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!analysis && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบข้อมูลการขาย</h3>
            <p className="text-gray-500 mb-4">
              ไม่มีข้อมูลการขายหวยในวันที่เลือก กรุณาเลือกวันที่อื่น
            </p>
            <Button onClick={fetchSalesAnalysis} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No High Risk Numbers State */}
      {analysis && analysis.total_sales_all === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-400 mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">ไม่มีข้อมูลยอดขายในวันที่เลือก</h3>
            <p className="text-gray-500 mb-4">
              วันที่: {new Date(selectedDate).toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <div className="text-sm text-gray-400 mb-4">
              - ตรวจสอบว่ามีการขายหวยในวันที่เลือกหรือไม่<br/>
              - ตรวจสอบว่าสถานะบิลเป็น "confirmed" หรือไม่<br/>
              - ลองเลือกวันที่อื่นที่มีข้อมูล
            </div>
            <Button onClick={fetchSalesAnalysis} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Add Dialog */}
      <Dialog open={quickAddDialog} onOpenChange={setQuickAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มหมายเลข {quickAddNumber?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>หมายเลข: <span className="font-mono font-bold">{quickAddNumber?.number}</span></p>
              <p>ประเภท: {quickAddNumber?.digit_count} ตัว{quickAddNumber?.type_number}</p>
              <p>ยอดขาย: {quickAddNumber ? formatCurrency(quickAddNumber.total_sales) : ''}</p>
              <p>ความเสี่ยง: {quickAddNumber ? formatPercentage(quickAddNumber.risk_percentage) : ''}</p>
            </div>
            <div className="text-sm text-gray-500">
              เลือกวิธีการจัดการสำหรับหมายเลขนี้:
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => quickAddNumber && addQuickNumber(quickAddNumber, 'half')}
                variant="outline"
                className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Scissors className="h-4 w-4 mr-2" />
                หารครึ่ง
              </Button>
              <Button
                onClick={() => quickAddNumber && addQuickNumber(quickAddNumber, 'close')}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-2" />
                ปิดรับ
              </Button>
            </div>
            <div className="text-xs text-gray-400">
              หารครึ่ง = ลดอัตราจ่าย 50% | ปิดรับ = หยุดรับแทงหมายเลขนี้
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 