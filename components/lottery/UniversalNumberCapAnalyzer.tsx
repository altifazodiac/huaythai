"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Plus, Settings, Ban, Scissors, BarChart3, Users, Calendar, Clock, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
} as const;

const slideDownVariants = {
    initial: { opacity: 0, height: 0, y: -20 },
    animate: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } },
} as const;


// Helper function to generate permutations
const getPermutations = (str: string): string[] => {
  if (str.length <= 1) return [str];
  const allPerms: Set<string> = new Set();
  const chars = str.split('');

  const generate = (currentPerm: string[], remainingChars: string[]) => {
    if (remainingChars.length === 0) {
      allPerms.add(currentPerm.join(''));
      return;
    }
    for (let i = 0; i < remainingChars.length; i++) {
      const newRemaining = [...remainingChars];
      const [nextChar] = newRemaining.splice(i, 1);
      generate([...currentPerm, nextChar], newRemaining);
    }
  };

  generate([], chars);
  return Array.from(allPerms);
};

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

interface ManualAddFormState {
  number: string;
  is2Digits: boolean;
  is3Digits: boolean;
  isTop: boolean;
  isBottom: boolean;
  isTod: boolean;
  isSwap: boolean;
  action: 'half' | 'close';
  reason: string;
}

export default function UniversalNumberCapAnalyzer({ lottery_sub_type_id, onClose }: Props) {
  const { managedNumbers, addManagedNumber, removeManagedNumber: removeManagedNumberFromContext, fetchManagedNumbers, updateManagedNumbersForSubType, checkNumberStatus } = useNumberCap();
  const [lotterySubType, setLotterySubType] = useState<LotterySubType | null>(null);
  
  function getTodayTH() {
    const now = new Date();
    now.setHours(now.getHours() + 7 - now.getTimezoneOffset() / 60);
    return now.toISOString().split('T')[0];
  }
  const [selectedDate, setSelectedDate] = useState(getTodayTH());
  const [riskThreshold, setRiskThreshold] = useState(70); // 70% risk threshold
  const { analysis, loading, fetchSalesAnalysis } = useNumberCapAnalysis(lottery_sub_type_id, selectedDate, riskThreshold);
  const [testMode, setTestMode] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(true);
  const [manualForm, setManualForm] = useState<ManualAddFormState>({
    number: '',
    is2Digits: true,
    is3Digits: false,
    isTop: true,
    isBottom: false,
    isTod: false,
    isSwap: true,
    action: 'half',
    reason: 'เลขดัง',
  });
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  const handleManualFormChange = (field: keyof ManualAddFormState, value: string | boolean) => {
    setManualForm(prev => {
      let newState = { ...prev, [field]: value };

      // Handle digit selection logic
      if (field === 'is2Digits' && value === true) {
        newState.is3Digits = false;
        if (newState.number.length > 2) newState.number = newState.number.substring(0, 2);
      }
      if (field === 'is3Digits' && value === true) {
        newState.is2Digits = false;
        if (newState.number.length > 3) newState.number = newState.number.substring(0, 3);
      }
      
      // Ensure at least one digit type is selected
      if (field === 'is2Digits' && value === false && !newState.is3Digits) {
        newState.is3Digits = true;
      }
      if (field === 'is3Digits' && value === false && !newState.is2Digits) {
        newState.is2Digits = true;
      }

      // Handle 3-digit specific rules
      if (newState.is3Digits) {
        newState.isBottom = false;
      }

      // Handle 2-digit specific rules
      if (newState.is2Digits) {
        newState.isTod = false; // No 'tod' for 2 digits
      }

      // Ensure at least one type (top/bottom/tod) is selected
      if (!newState.isTop && !newState.isBottom && !newState.isTod) {
        newState.isTop = true;
      }

      return newState;
    });
  };

  const handleManualNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    const limit = manualForm.is3Digits ? 3 : 2;
    if (value.length > limit) value = value.slice(0, limit);
    setManualForm(prev => ({...prev, number: value}));
  }

  const handleAddManualNumbers = async () => {
    const { number, is2Digits, is3Digits, isTop, isBottom, isTod, isSwap, action, reason } = manualForm;
    if (!number.trim()) { toast.error('กรุณาใส่หมายเลข'); return; }
    const digitCount = is3Digits ? 3 : 2;
    if (number.length !== digitCount) { toast.error(`กรุณาใส่เลข ${digitCount} หลัก`); return; }
    
    let numbersToAdd: { num: string, type: string, digit: number }[] = [];
    const baseNumbers = isSwap ? getPermutations(number) : [number];

    baseNumbers.forEach(num => {
      if (isTop) numbersToAdd.push({ num, type: 'บน', digit: digitCount });
      if (isBottom) numbersToAdd.push({ num, type: 'ล่าง', digit: digitCount });
      if (is3Digits && isTod) {
         getPermutations(number).forEach(p => { numbersToAdd.push({ num: p, type: 'โต๊ด', digit: 3 }); })
      }
    });
    
    const uniqueNumbersToAdd = Array.from(new Set(numbersToAdd.map(n => JSON.stringify(n)))).map(s => JSON.parse(s));
    let addedCount = 0;
    let skippedCount = 0;

    for (const item of uniqueNumbersToAdd) {
       const newManagedNumber: ManagedNumber = {
        number: item.num, digit_count: item.digit, type_number: item.type, action,
        reason, is_manual: true, lottery_sub_type_id, draw_date: selectedDate,
      };
      try {
        await addManagedNumber(newManagedNumber);
        addedCount++;
      } catch (error: any) {
        console.warn(`Skipping existing number: ${error.message}`);
        skippedCount++;
      }
    }
    
    if (addedCount > 0) {
      toast.success(`เพิ่ม ${addedCount} เลขสำเร็จ`, {
         description: skippedCount > 0 ? `ข้าม ${skippedCount} เลขที่มีอยู่แล้ว` : undefined,
      });
      setActiveTab('managed'); // Switch to managed tab
    } else if (skippedCount > 0) {
      toast.info(`เลขทั้งหมดมีอยู่แล้ว ไม่ได้เพิ่มเลขใหม่`);
      setActiveTab('managed'); // Switch to managed tab to show existing numbers
    }
    setManualForm(prev => ({ ...prev, number: '' }));
  };
  
  useEffect(() => {
    const fetchSubType = async () => {
      try {
        const { data, error } = await supabase.from('lottery_sub_types')
          .select('lottery_sub_type_id, sub_type_name, country_origin, lottery_type_id')
          .eq('lottery_sub_type_id', lottery_sub_type_id).single();
        if (error) throw error;
        setLotterySubType(data);
      } catch (error) {
        console.error('Error fetching lottery subtype:', error);
        toast.error('ไม่สามารถดึงข้อมูลประเภทหวยได้');
      }
    };
    fetchSubType();
  }, [lottery_sub_type_id]);

  useEffect(() => {
    if (!testMode) fetchSalesAnalysis();
  }, [selectedDate, riskThreshold, testMode, lottery_sub_type_id, fetchSalesAnalysis]);

  useEffect(() => {
    fetchManagedNumbers(lottery_sub_type_id, selectedDate);
  }, [lottery_sub_type_id, selectedDate, fetchManagedNumbers]);

  const toggleNumberSelection = (numberKey: string) => {
    setSelectedNumbers(prev => prev.includes(numberKey) ? prev.filter(key => key !== numberKey) : [...prev, numberKey]);
  };
  
  const addSelectedToManaged = async (action: 'half' | 'close') => {
    if (selectedNumbers.length === 0) { toast.error('กรุณาเลือกหมายเลขก่อน'); return; }
    const allNumbers = [...(analysis?.high_risk_numbers || []), ...(analysis?.medium_risk_numbers || []), ...(analysis?.safe_numbers || [])];
    const newManagedNumbers: ManagedNumber[] = selectedNumbers.map(numberKey => {
      const numberData = allNumbers.find(n => `${n.number}-${n.digit_count}-${n.type_number}` === numberKey);
      if (numberData) {
        return {
          number: numberData.number, digit_count: numberData.digit_count, type_number: numberData.type_number, action,
          reason: `ความเสี่ยง ${formatPercentage(numberData.risk_percentage)}`, is_manual: false, lottery_sub_type_id,
          draw_date: selectedDate, risk_percentage: numberData.risk_percentage
        };
      }
      return null;
    }).filter(Boolean) as ManagedNumber[];

    try {
      for (const newManagedNumber of newManagedNumbers) await addManagedNumber(newManagedNumber);
      setSelectedNumbers([]);
      toast.success(`เพิ่ม ${newManagedNumbers.length} เลขเข้าระบบจัดการเรียบร้อย`);
    } catch (error) {
      console.error('Error adding managed numbers:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มเลขอั้น');
    }
  };

  const clearManagedNumbers = async () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างรายการจัดการทั้งหมด?')) {
      try {
        const { error } = await supabase.from('managed_numbers').delete().eq('lottery_sub_type_id', lottery_sub_type_id).eq('draw_date', selectedDate);
        if (error) throw error;
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
        <CardHeader><CardTitle className="flex items-center gap-2">{icon}{title} ({numbers.length} เลข)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 w-8">เลือก</th><th className="text-left p-2">เลข</th><th className="text-left p-2">ประเภท</th>
                  <th className="text-right p-2">ยอดขาย</th><th className="text-right p-2">เงินรางวัล</th><th className="text-right p-2">ความเสี่ยง</th>
                  <th className="text-center p-2">จำนวนบิล</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((number, index) => {
                  const numberKey = `${number.number}-${number.digit_count}-${number.type_number}`;
                  const isSelected = selectedNumbers.includes(numberKey);
                  const isManaged = managedNumbers.some(m => `${m.number}-${m.digit_count}-${m.type_number}` === numberKey);
                  return (
                    <tr key={index} className={`border-b hover:bg-opacity-50 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/20' : ''} ${isManaged ? 'opacity-40 bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                      <td className="p-2"><Checkbox checked={isSelected} disabled={isManaged} onCheckedChange={() => toggleNumberSelection(numberKey)} /></td>
                      <td className="p-2 font-mono font-bold">{number.number}</td><td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                      <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td><td className="p-2 text-right font-bold">{formatCurrency(number.potential_payout)}</td>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
    <Card className="m-2 md:m-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
                <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg"><BarChart3 className="h-6 w-6 text-red-600 dark:text-red-400" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">ระบบจัดการเลขอั้น</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{lotterySubType?.sub_type_name} • {lotterySubType?.country_origin}</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5"/></Button>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" /><label className="text-sm font-medium dark:text-gray-200">วันที่:</label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" disabled={testMode || loading} />
            </div>
            <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400" /><label className="text-sm font-medium dark:text-gray-200">เกณฑ์ (%):</label>
              <Input type="number" value={riskThreshold} onChange={(e) => setRiskThreshold(Number(e.target.value))} className="w-20" min="1" max="100" disabled={loading} />
            </div>
                    <Button onClick={() => { if (!testMode) fetchSalesAnalysis(); }} disabled={loading || testMode}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}วิเคราะห์ใหม่
            </Button>
          </div>
          <div className="flex items-center gap-2">
              <Button onClick={() => setShowManualAdd(prev => !prev)} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />เพิ่มเลขด้วยตนเอง
              </Button>
                    <Button onClick={() => { setTestMode(prev => !prev); if(testMode) { setSelectedNumbers([]); toast.info("ออกจากโหมดทดสอบ"); } }} variant="outline" className={testMode ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" : ""}>
                {testMode ? "ออกจากโหมดทดสอบ" : "ทดสอบ"}
              </Button>
          </div>
      </div>
            
            <AnimatePresence>
            {showManualAdd && (
                <motion.div
                    key="manual-add-form"
                    variants={slideDownVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ overflow: 'hidden' }}
                >
                    <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <CardHeader className="py-3"><CardTitle className="text-lg text-blue-800 dark:text-blue-300 flex items-center"><Plus className="mr-2 h-5 w-5"/>เพิ่มเลขดัง/เลขอั้นด้วยตนเอง</CardTitle></CardHeader>
                        <CardContent className="pt-2 pb-4">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                          <div className="space-y-2">
                              <label className="font-semibold dark:text-gray-200">หมายเลข</label>
                              <Input placeholder={manualForm.is3Digits ? "เช่น 123" : "เช่น 45"} value={manualForm.number} onChange={handleManualNumberInputChange} maxLength={manualForm.is3Digits ? 3 : 2} className="text-lg h-12 bg-white dark:bg-gray-800" />
                              <div className="flex items-center space-x-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200"><Checkbox id="is2Digits" checked={manualForm.is2Digits} onCheckedChange={(checked) => handleManualFormChange('is2Digits', !!checked)} /> 2 ตัว</label>
                                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200"><Checkbox id="is3Digits" checked={manualForm.is3Digits} onCheckedChange={(checked) => handleManualFormChange('is3Digits', !!checked)} /> 3 ตัว</label>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="font-semibold dark:text-gray-200">ประเภท</label>
                              <div className="flex flex-col space-y-2 pt-2">
                                  <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200"><Checkbox id="isTop" checked={manualForm.isTop} onCheckedChange={(checked) => handleManualFormChange('isTop', !!checked)} /> บน</label>
                                  {!manualForm.is3Digits && <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200"><Checkbox id="isBottom" checked={manualForm.isBottom} onCheckedChange={(checked) => handleManualFormChange('isBottom', !!checked)} /> ล่าง</label>}
                                   {manualForm.is3Digits && (<label className="flex items-center gap-2 cursor-pointer dark:text-gray-200"><Checkbox id="isTod" checked={manualForm.isTod} onCheckedChange={(checked) => handleManualFormChange('isTod', !!checked)} /> โต๊ด</label>)}
                                   <label className="flex items-center gap-2 cursor-pointer pt-1 dark:text-gray-200"><Checkbox id="isSwap" checked={manualForm.isSwap} onCheckedChange={(checked) => handleManualFormChange('isSwap', !!checked)} /> กลับเลข</label>
                              </div>
                          </div>
                          <div className="space-y-2">
                            <label className="font-semibold dark:text-gray-200">การดำเนินการ</label>
                             <Select value={manualForm.action} onValueChange={(value: 'half' | 'close') => handleManualFormChange('action', value)}>
                                <SelectTrigger><SelectValue placeholder="เลือกการดำเนินการ" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="half"><Scissors className="inline-block mr-2 h-4 w-4"/>หารครึ่ง</SelectItem>
                                  <SelectItem value="close"><Ban className="inline-block mr-2 h-4 w-4"/>ปิดรับ</SelectItem>
                                </SelectContent>
                              </Select>
                              <label className="font-semibold pt-2 block dark:text-gray-200">เหตุผล</label>
                              <Input placeholder="เช่น เลขดัง, เลขเฉพาะกิจ" value={manualForm.reason} onChange={(e) => handleManualFormChange('reason', e.target.value)} />
                          </div>
                       </div>
                       <div className="mt-4 flex justify-end"><Button onClick={handleAddManualNumbers}><Plus className="mr-2 h-4 w-4" />เพิ่มเข้าระบบ</Button></div>
                    </CardContent>
                </Card>
                </motion.div>
            )}
            </AnimatePresence>
      
      {testMode && <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 rounded-lg p-3 text-sm flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><span>กำลังแสดงข้อมูลตัวอย่างสำหรับทดสอบระบบ</span></div>}
      {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" /> <span className="ml-2 dark:text-gray-300">กำลังวิเคราะห์ข้อมูล...</span></div>}
      
      {!loading && analysis && (
                <motion.div
                    key="analysis-results"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="analysis"><BarChart3 className="mr-2" />ผลวิเคราะห์</TabsTrigger>
                        <TabsTrigger value="managed"><Settings className="mr-2" />รายการจัดการ ({filteredManagedNumbers.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="analysis">
                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants}><Card><CardHeader className="pb-2"><CardTitle className="text-sm dark:text-gray-200">ยอดขายรวม</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(analysis.total_sales_all)}</div></CardContent></Card></motion.div>
                            <motion.div variants={itemVariants}><Card><CardHeader className="pb-2"><CardTitle className="text-sm dark:text-gray-200">อาจต้องจ่าย</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(analysis.total_potential_payout)}</div></CardContent></Card></motion.div>
                            <motion.div variants={itemVariants}><Card><CardHeader className="pb-2"><CardTitle className="text-sm dark:text-gray-200">ความเสี่ยงรวม</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${analysis.overall_risk_percentage > riskThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatPercentage(analysis.overall_risk_percentage)}</div></CardContent></Card></motion.div>
                            <motion.div variants={itemVariants}><Card><CardHeader className="pb-2"><CardTitle className="text-sm dark:text-gray-200">เลขอั้น</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600 dark:text-red-400">{analysis.high_risk_numbers.length}</div><div className="text-xs text-gray-500 dark:text-gray-400">เลข</div></CardContent></Card></motion.div>
                        </motion.div>
                        <motion.div variants={itemVariants}>{renderNumberTable('เลขอั้น - ควรจัดการด่วน', analysis.high_risk_numbers, <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />, 'border-red-200 dark:border-red-800')}</motion.div>
                        <motion.div variants={itemVariants}>{renderNumberTable('เลขเสี่ยงปานกลาง - ควรติดตาม', analysis.medium_risk_numbers, <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />, 'border-orange-200 dark:border-orange-800')}</motion.div>
                        {!analysis.total_sales_all && <div className="text-center p-8 text-gray-500 dark:text-gray-400">ไม่พบข้อมูลการขายในวันที่เลือก</div>}
                    </TabsContent>
                    <TabsContent value="managed">
                         {filteredManagedNumbers.length > 0 ? (
                            <Card className="mt-4">
                                <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">หมายเลข</th><th className="text-left p-2">ประเภท</th><th className="text-left p-2">การจัดการ</th><th className="text-left p-2">เหตุผล</th><th className="text-left p-2">ที่มา</th><th className="text-center p-2">จัดการ</th></tr></thead>
                    <tbody>
                      {filteredManagedNumbers.map((managed, index) => (
                        <tr key={index} className="border-b hover:bg-green-50 dark:hover:bg-green-900/20">
                                              <td className="p-2 font-mono font-bold">{managed.number}</td><td className="p-2">{managed.digit_count} ตัว{managed.type_number}</td>
                          <td className="p-2"><Badge variant={managed.action === 'half' ? 'outline' : 'destructive'}>{managed.action === 'half' ? <><Scissors className="h-3 w-3 mr-1" />หารครึ่ง</> : <><Ban className="h-3 w-3 mr-1" />ปิดรับ</>}</Badge></td>
                                              <td className="p-2 text-sm text-gray-600 dark:text-gray-400">{managed.reason}</td><td className="p-2"><Badge variant={managed.is_manual ? 'secondary' : 'outline'}>{managed.is_manual ? 'ด้วยตนเอง' : 'วิเคราะห์'}</Badge></td>
                          <td className="p-2 text-center"><Button size="sm" variant="ghost" onClick={() => removeManagedNumberFromContext(`${managed.number}-${managed.digit_count}-${managed.type_number}`)}>ลบ</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">รวม: หารครึ่ง {filteredManagedNumbers.filter(m => m.action === 'half').length} เลข, ปิดรับ {filteredManagedNumbers.filter(m => m.action === 'close').length} เลข</div>
                  <div className="flex gap-2"><Button onClick={exportManagedNumbers} variant="outline" size="sm">ส่งออก CSV</Button><Button onClick={clearManagedNumbers} variant="outline" size="sm">ล้างทั้งหมด</Button></div>
                </div>
              </CardContent>
            </Card>
                        ) : (<div className="text-center p-8 text-gray-500 dark:text-gray-400">ไม่มีรายการจัดการสำหรับวันที่เลือก</div>)}
                    </TabsContent>
                </Tabs>
                </motion.div>
          )}

            <AnimatePresence>
      {selectedNumbers.length > 0 && (
                <motion.div
                    key="selection-card"
                    className="fixed bottom-4 right-4 w-80 z-50"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }}
                >
                    <Card className="shadow-lg">
          <CardHeader><CardTitle className="text-lg flex justify-between items-center"><span>เลือก {selectedNumbers.length} รายการ</span><Button variant="ghost" size="sm" onClick={() => setSelectedNumbers([])}>ยกเลิก</Button></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2"><Button onClick={handleActionDialog} className="w-full"><Settings className="mr-2 h-4 w-4" />จัดการเลขที่เลือก</Button></CardContent>
        </Card>
                </motion.div>
            )}
            </AnimatePresence>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>เลือกการกระทำสำหรับ {selectedNumbers.length} เลขที่เลือก</AlertDialogTitle><AlertDialogDescription>คุณต้องการ "หารครึ่ง" หรือ "ปิดรับ" สำหรับตัวเลขที่เลือกทั้งหมด?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleSelectAction('half')}><Scissors className="mr-2 h-4 w-4" />หารครึ่ง</Button>
            <Button variant="destructive" onClick={() => handleSelectAction('close')}><Ban className="mr-2 h-4 w-4" />ปิดรับ</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </CardContent>
        <CardFooter className="flex justify-end pt-6 border-t mt-4">
            <Button variant="outline" onClick={onClose}>ปิดหน้าต่าง</Button>
        </CardFooter>
    </Card>
    </motion.div>
  );
} 