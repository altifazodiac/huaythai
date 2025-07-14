import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { toast } from 'sonner';

export interface NumberSalesData {
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

export interface SalesAnalysis {
  total_sales_all: number;
  total_potential_payout: number;
  overall_risk_percentage: number;
  high_risk_numbers: NumberSalesData[];
  medium_risk_numbers: NumberSalesData[];
  safe_numbers: NumberSalesData[];
}

export function useNumberCapAnalysis(lottery_sub_type_id: number, selectedDate: string, riskThreshold: number) {
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSalesAnalysis = useCallback(async () => {
    console.log('🔍 fetchSalesAnalysis called with:', { lottery_sub_type_id, selectedDate, riskThreshold });
    setLoading(true);
    toast.info('กำลังวิเคราะห์ข้อมูล...');
    try {
      // 1. Fetch sales data (unchanged)
      const { data: salesData, error: salesError } = await supabase
        .from('lottery_tickets')
        .select(`total_amount, lottery_ticket_items!inner(numbers, amount, lottery_sub_type_id, lottery_sub_number_id)`)
        .eq('draw_date', selectedDate)
        .eq('status', 'confirmed')
        .eq('lottery_ticket_items.lottery_sub_type_id', lottery_sub_type_id);
      if (salesError) throw new Error(`Database error: ${salesError.message}`);
      console.log('📊 Sales data found:', salesData?.length || 0, 'tickets');

      // 2. Fetch payout_cap from the lottery subtype
      const { data: subTypeData, error: subTypeError } = await supabase
        .from('lottery_sub_types')
        .select('payout_cap')
        .eq('lottery_sub_type_id', lottery_sub_type_id)
        .single();
      if (subTypeError) throw new Error(`Payout cap fetch error: ${subTypeError.message}`);
      
      const payoutCap = subTypeData?.payout_cap ?? 200000; // Use fetched cap or default

      // 3. Fetch payout rules separately
      const { data: payoutRules, error: payoutError } = await supabase
        .from('lottery_sub_number')
        .select('*')
        .eq('lottery_sub_type_id', lottery_sub_type_id);
      if (payoutError) throw new Error(`Payout rules error: ${payoutError.message}`);
      
      console.log('💰 Payout rules found:', payoutRules?.length || 0, 'rules');
      console.log('🏦 Payout Cap:', payoutCap);

      if (!salesData || salesData.length === 0) {
        console.log('⚠️ No sales data found');
        toast.warning('ไม่พบข้อมูลการขายในวันที่เลือก');
        setAnalysis({ total_sales_all: 0, total_potential_payout: 0, overall_risk_percentage: 0, high_risk_numbers: [], medium_risk_numbers: [], safe_numbers: [] });
        setLoading(false);
        return;
      }

      // 4. Process data (calculation logic change here)
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
            // Potential payout calculation remains the same
            numberSalesMap[key].potential_payout = numberSalesMap[key].total_sales * numberSalesMap[key].price_paid;
          });
        });
      });

      // 5. Calculate risk based on Payout Cap
      Object.values(numberSalesMap).forEach(numberData => {
        // --- THIS IS THE KEY CHANGE ---
        // Risk is now (Potential Payout / Payout Cap) * 100
        numberData.risk_percentage = payoutCap > 0 ? (numberData.potential_payout / payoutCap) * 100 : 0;
        numberData.is_capped = numberData.risk_percentage > riskThreshold;
      });

      const allNumbers = Object.values(numberSalesMap);
      const highRiskNumbers = allNumbers.filter(n => n.risk_percentage > riskThreshold);
      const mediumRiskNumbers = allNumbers.filter(n => n.risk_percentage > riskThreshold / 2 && n.risk_percentage <= riskThreshold);
      const safeNumbers = allNumbers.filter(n => n.risk_percentage <= riskThreshold / 2);
      
      const totalPotentialPayout = allNumbers.reduce((sum, n) => sum + n.potential_payout, 0);

      // --- OVERALL RISK is now also based on Payout Cap ---
      const overallRiskPercentage = payoutCap > 0 ? (totalPotentialPayout / payoutCap) * 100 : 0;
      
      const analysisResult = {
        total_sales_all: totalSalesAll,
        total_potential_payout: totalPotentialPayout,
        overall_risk_percentage: overallRiskPercentage,
        high_risk_numbers: highRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        medium_risk_numbers: mediumRiskNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage),
        safe_numbers: safeNumbers.sort((a, b) => b.risk_percentage - a.risk_percentage)
      };
      console.log('✅ Analysis completed:', {
        total_sales: totalSalesAll,
        high_risk_count: analysisResult.high_risk_numbers.length,
        medium_risk_count: analysisResult.medium_risk_numbers.length,
        safe_count: analysisResult.safe_numbers.length
      });
      toast.success(`วิเคราะห์เสร็จสิ้น: เลขอั้น ${analysisResult.high_risk_numbers.length} เลข`);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('❌ Analysis error:', error);
      toast.error(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'ไม่สามารถวิเคราะห์ข้อมูลได้'}`);
      setAnalysis({ total_sales_all: 0, total_potential_payout: 0, overall_risk_percentage: 0, high_risk_numbers: [], medium_risk_numbers: [], safe_numbers: [] });
    } finally {
      setLoading(false);
    }
  }, [lottery_sub_type_id, selectedDate, riskThreshold]);

  return { analysis, loading, fetchSalesAnalysis };
} 