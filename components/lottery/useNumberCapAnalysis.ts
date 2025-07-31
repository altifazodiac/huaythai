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
  // Advanced risk metrics
  volatility: number;
  concentrationRisk: number;
  marketShareRisk: number;
  var95: number; // Value at Risk 95%
  sharpeRatio: number;
  compositeRiskScore: number;
  // Result comparison
  isWinning?: boolean;
  accuracyScore?: number;
}

export interface SalesAnalysis {
  total_sales_all: number;
  total_potential_payout: number;
  overall_risk_percentage: number;
  high_risk_numbers: NumberSalesData[];
  medium_risk_numbers: NumberSalesData[];
  safe_numbers: NumberSalesData[];
  // Advanced metrics
  portfolioVolatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number;
  concentrationIndex: number;
  // Result analysis
  winningNumbers?: string[];
  accuracyPercentage?: number;
  highRiskAccuracy?: number;
  mediumRiskAccuracy?: number;
  safeAccuracy?: number;
}

interface LotteryResult {
  id: number;
  lottery_sub_type_id: number;
  draw_date: string;
  prize_code: string;
  winning_number: string;
}

// Advanced risk calculation functions
const calculateVolatility = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const calculateVaR = (potentialPayout: number, volatility: number, confidenceLevel: number = 0.95): number => {
  const zScore = 1.645; // 95% confidence level
  return potentialPayout * volatility * zScore;
};

const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 0.02): number => {
  if (returns.length === 0) return 0;
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const volatility = calculateVolatility(returns);
  return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
};

const calculateConcentrationRisk = (individualAmount: number, totalAmount: number): number => {
  return totalAmount > 0 ? (individualAmount / totalAmount) * 100 : 0;
};

const calculateMarketShareRisk = (numberSales: number, totalMarketSales: number): number => {
  return totalMarketSales > 0 ? (numberSales / totalMarketSales) * 100 : 0;
};

const calculateCompositeRiskScore = (
  volatility: number,
  concentrationRisk: number,
  marketShareRisk: number,
  payoutRatio: number
): number => {
  // Weighted risk score (0-100)
  const weights = {
    volatility: 0.25,
    concentration: 0.30,
    marketShare: 0.25,
    payoutRatio: 0.20
  };
  
  return (
    (volatility * weights.volatility) +
    (concentrationRisk * weights.concentration) +
    (marketShareRisk * weights.marketShare) +
    (payoutRatio * weights.payoutRatio)
  );
};

// Function to check if a number is winning
const checkWinningNumber = (number: string, digitCount: number, typeNumber: string, winningNumbers: string[]): boolean => {
  if (!winningNumbers || winningNumbers.length === 0) return false;
  
  // Check exact match for 2-digit and 3-digit numbers
  if (typeNumber === 'บน' || typeNumber === 'ล่าง') {
    return winningNumbers.some(winning => winning.trim() === number);
  }
  
  // Check for 'โต๊ด' (permutation match)
  if (typeNumber === 'โต๊ด' && digitCount === 3) {
    const numberPermutations = getPermutations(number);
    return winningNumbers.some(winning => 
      numberPermutations.some(perm => perm === winning.trim())
    );
  }
  
  return false;
};

// Helper function to generate permutations (for 3-digit numbers)
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

// Function to calculate accuracy percentage
const calculateAccuracyPercentage = (numbers: NumberSalesData[]): number => {
  if (numbers.length === 0) return 0;
  const winningCount = numbers.filter(n => n.isWinning).length;
  return (winningCount / numbers.length) * 100;
};

export function useNumberCapAnalysis(lottery_sub_type_id: number, selectedDate: string, riskThreshold: number) {
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSalesAnalysis = useCallback(async () => {
    console.log('🔍 fetchSalesAnalysis called with:', { lottery_sub_type_id, selectedDate, riskThreshold });
    setLoading(true);
    toast.info('กำลังวิเคราะห์ข้อมูลด้วยมาตรฐานสากล...');
    try {
      // 1. Fetch sales data with historical context
      const { data: salesData, error: salesError } = await supabase
        .from('lottery_tickets')
        .select(`total_amount, draw_date, lottery_ticket_items!inner(numbers, amount, lottery_sub_type_id, lottery_sub_number_id)`)
        .eq('status', 'confirmed')
        .eq('lottery_ticket_items.lottery_sub_type_id', lottery_sub_type_id)
        .gte('draw_date', new Date(new Date(selectedDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
        .lte('draw_date', selectedDate);
      
      if (salesError) throw new Error(`Database error: ${salesError.message}`);
      console.log('📊 Sales data found:', salesData?.length || 0, 'tickets');

      // 2. Fetch lottery results for the selected date
      const { data: lotteryResults, error: resultsError } = await supabase
        .from('lottery_results')
        .select('*')
        .eq('lottery_sub_type_id', lottery_sub_type_id)
        .eq('draw_date', selectedDate);
      
      if (resultsError) {
        console.warn('⚠️ No lottery results found for date:', selectedDate);
      }
      
      console.log('🎯 Lottery results found:', lotteryResults?.length || 0, 'results');

      // 3. Fetch payout_cap from the lottery subtype
      const { data: subTypeData, error: subTypeError } = await supabase
        .from('lottery_sub_types')
        .select('payout_cap')
        .eq('lottery_sub_type_id', lottery_sub_type_id)
        .single();
      if (subTypeError) throw new Error(`Payout cap fetch error: ${subTypeError.message}`);
      
      const payoutCap = subTypeData?.payout_cap ?? 200000;

      // 4. Fetch payout rules
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
        setAnalysis({ 
          total_sales_all: 0, 
          total_potential_payout: 0, 
          overall_risk_percentage: 0, 
          high_risk_numbers: [], 
          medium_risk_numbers: [], 
          safe_numbers: [],
          portfolioVolatility: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          var95: 0,
          concentrationIndex: 0
        });
        setLoading(false);
        return;
      }

      // 5. Process data with advanced risk metrics
      const payoutRulesMap: Record<number, any> = {};
      payoutRules?.forEach(rule => { payoutRulesMap[rule.id] = rule; });

      const numberSalesMap: Record<string, NumberSalesData> = {};
      const historicalData: Record<string, number[]> = {};
      let totalSalesAll = 0;
      let totalMarketSales = 0;

      // Calculate total market sales
      salesData.forEach(ticket => {
        totalMarketSales += Number(ticket.total_amount || 0);
      });

      // Process current period data
      const currentPeriodData = salesData.filter(ticket => ticket.draw_date === selectedDate);
      
      currentPeriodData.forEach(ticket => {
        totalSalesAll += Number(ticket.total_amount || 0);
        ticket.lottery_ticket_items?.forEach(item => {
          const payoutRule = payoutRulesMap[item.lottery_sub_number_id];
          if (!payoutRule) return;
          item.numbers?.forEach((number: string) => {
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
                total_bets: 0,
                volatility: 0,
                concentrationRisk: 0,
                marketShareRisk: 0,
                var95: 0,
                sharpeRatio: 0,
                compositeRiskScore: 0
              };
              historicalData[key] = [];
            }
            const sales = Number(item.amount || 0);
            numberSalesMap[key].total_sales += sales;
            numberSalesMap[key].total_bets += 1;
            numberSalesMap[key].potential_payout = numberSalesMap[key].total_sales * numberSalesMap[key].price_paid;
          });
        });
      });

      // Calculate historical volatility for each number
      salesData.forEach(ticket => {
        ticket.lottery_ticket_items?.forEach(item => {
          const payoutRule = payoutRulesMap[item.lottery_sub_number_id];
          if (!payoutRule) return;
          item.numbers?.forEach((number: string) => {
            const key = `${number}-${payoutRule.digit_number}-${payoutRule.type_number}`;
            if (historicalData[key]) {
              historicalData[key].push(Number(item.amount || 0));
            }
          });
        });
      });

      // 6. Calculate advanced risk metrics and check winning numbers
      const winningNumbers: string[] = [];
      
      // Extract winning numbers from lottery results
      lotteryResults?.forEach(result => {
        if (result.winning_number) {
          const numbers = result.winning_number.split(',').map(n => n.trim());
          winningNumbers.push(...numbers);
        }
      });

      Object.values(numberSalesMap).forEach(numberData => {
        const key = `${numberData.number}-${numberData.digit_count}-${numberData.type_number}`;
        const historicalValues = historicalData[key] || [];
        
        // Basic risk percentage (original method)
        numberData.risk_percentage = payoutCap > 0 ? (numberData.potential_payout / payoutCap) * 100 : 0;
        numberData.is_capped = numberData.risk_percentage > riskThreshold;
        
        // Advanced risk metrics
        numberData.volatility = calculateVolatility(historicalValues);
        numberData.concentrationRisk = calculateConcentrationRisk(numberData.total_sales, totalSalesAll);
        numberData.marketShareRisk = calculateMarketShareRisk(numberData.total_sales, totalMarketSales);
        numberData.var95 = calculateVaR(numberData.potential_payout, numberData.volatility);
        
        // Calculate returns for Sharpe ratio (simplified)
        const returns = historicalValues.length > 1 ? 
          historicalValues.slice(1).map((val, i) => (val - historicalValues[i]) / historicalValues[i]) : 
          [0];
        numberData.sharpeRatio = calculateSharpeRatio(returns);
        
        // Composite risk score
        const payoutRatio = numberData.potential_payout / (payoutCap || 1);
        numberData.compositeRiskScore = calculateCompositeRiskScore(
          numberData.volatility,
          numberData.concentrationRisk,
          numberData.marketShareRisk,
          payoutRatio
        );
        
        // Check if this number is winning
        numberData.isWinning = checkWinningNumber(
          numberData.number, 
          numberData.digit_count, 
          numberData.type_number, 
          winningNumbers
        );
        
        // Calculate accuracy score (how well the risk analysis predicted this number)
        if (numberData.isWinning) {
          // If high risk number wins, it means the analysis was wrong (lower accuracy for operator)
          // If low risk number wins, it means the analysis was correct (higher accuracy for operator)
          if (numberData.compositeRiskScore >= riskThreshold) {
            // High risk number won - analysis was wrong, operator loses money
            numberData.accuracyScore = Math.max(20, 100 - (numberData.compositeRiskScore - riskThreshold) * 2);
          } else {
            // Low risk number won - analysis was correct, operator expected this
            numberData.accuracyScore = Math.min(95, 75 + (riskThreshold - numberData.compositeRiskScore) * 0.8);
          }
        } else {
          // If high risk number doesn't win, it means the analysis was correct (higher accuracy for operator)
          // If low risk number doesn't win, it means the analysis was wrong (lower accuracy for operator)
          if (numberData.compositeRiskScore >= riskThreshold) {
            // High risk number didn't win - analysis was correct, operator saved money
            numberData.accuracyScore = Math.min(95, 80 + (numberData.compositeRiskScore - riskThreshold) * 0.5);
          } else {
            // Low risk number didn't win - analysis was wrong, operator could have made more money
            numberData.accuracyScore = Math.max(30, 100 - (riskThreshold - numberData.compositeRiskScore) * 1.5);
          }
        }
      });

      const allNumbers = Object.values(numberSalesMap);
      
      // Sort numbers by composite risk score for better distribution
      const sortedNumbers = allNumbers.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore);
      
      // Distribute numbers more evenly across categories
      const totalNumbers = sortedNumbers.length;
      const highRiskCount = Math.ceil(totalNumbers * 0.3); // Top 30%
      const mediumRiskCount = Math.ceil(totalNumbers * 0.4); // Next 40%
      const safeCount = totalNumbers - highRiskCount - mediumRiskCount; // Remaining 30%
      
      const highRiskNumbers = sortedNumbers.slice(0, highRiskCount);
      const mediumRiskNumbers = sortedNumbers.slice(highRiskCount, highRiskCount + mediumRiskCount);
      const safeNumbers = sortedNumbers.slice(highRiskCount + mediumRiskCount);
      
      const totalPotentialPayout = allNumbers.reduce((sum, n) => sum + n.potential_payout, 0);

      // Calculate portfolio-level metrics
      const portfolioReturns = allNumbers.map(n => n.potential_payout / totalPotentialPayout);
      const portfolioVolatility = calculateVolatility(portfolioReturns);
      const maxDrawdown = Math.min(...allNumbers.map(n => n.potential_payout - n.total_sales));
      const portfolioSharpeRatio = calculateSharpeRatio(portfolioReturns);
      const portfolioVaR = calculateVaR(totalPotentialPayout, portfolioVolatility);
      const concentrationIndex = allNumbers.reduce((sum, n) => sum + Math.pow(n.concentrationRisk / 100, 2), 0);
      
      const overallRiskPercentage = payoutCap > 0 ? (totalPotentialPayout / payoutCap) * 100 : 0;
      
      // Calculate accuracy percentages
      const highRiskAccuracy = calculateAccuracyPercentage(highRiskNumbers);
      const mediumRiskAccuracy = calculateAccuracyPercentage(mediumRiskNumbers);
      const safeAccuracy = calculateAccuracyPercentage(safeNumbers);
      const overallAccuracy = calculateAccuracyPercentage(allNumbers);
      
      const analysisResult: SalesAnalysis = {
        total_sales_all: totalSalesAll,
        total_potential_payout: totalPotentialPayout,
        overall_risk_percentage: overallRiskPercentage,
        high_risk_numbers: highRiskNumbers.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore),
        medium_risk_numbers: mediumRiskNumbers.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore),
        safe_numbers: safeNumbers.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore),
        portfolioVolatility,
        maxDrawdown,
        sharpeRatio: portfolioSharpeRatio,
        var95: portfolioVaR,
        concentrationIndex,
        winningNumbers,
        accuracyPercentage: overallAccuracy,
        highRiskAccuracy,
        mediumRiskAccuracy,
        safeAccuracy
      };
      
      console.log('✅ Advanced analysis completed:', {
        total_sales: totalSalesAll,
        high_risk_count: analysisResult.high_risk_numbers.length,
        medium_risk_count: analysisResult.medium_risk_numbers.length,
        safe_count: analysisResult.safe_numbers.length,
        portfolio_volatility: portfolioVolatility,
        sharpe_ratio: portfolioSharpeRatio,
        var_95: portfolioVaR,
        winning_numbers: winningNumbers,
        accuracy_percentage: overallAccuracy,
        // Add digit distribution logging
        digit_distribution: {
          '2_digit': allNumbers.filter(n => n.digit_count === 2).length,
          '3_digit': allNumbers.filter(n => n.digit_count === 3).length,
          '2_digit_high_risk': highRiskNumbers.filter(n => n.digit_count === 2).length,
          '3_digit_high_risk': highRiskNumbers.filter(n => n.digit_count === 3).length,
          '2_digit_medium_risk': mediumRiskNumbers.filter(n => n.digit_count === 2).length,
          '3_digit_medium_risk': mediumRiskNumbers.filter(n => n.digit_count === 3).length,
          '2_digit_safe': safeNumbers.filter(n => n.digit_count === 2).length,
          '3_digit_safe': safeNumbers.filter(n => n.digit_count === 3).length
        }
      });
      
      toast.success(
        `✅ วิเคราะห์เสร็จสิ้น! พบ ${allNumbers.length} เลข | ` +
        `เลขอั้น: ${highRiskNumbers.length} | ` +
        `เลขเสี่ยงปานกลาง: ${mediumRiskNumbers.length} | ` +
        `เลขปลอดภัย: ${safeNumbers.length}` +
        (overallAccuracy ? ` | ประสิทธิภาพรวม: ${overallAccuracy.toFixed(1)}%` : '')
      );
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('❌ Analysis error:', error);
      toast.error(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'ไม่สามารถวิเคราะห์ข้อมูลได้'}`);
      setAnalysis({ 
        total_sales_all: 0, 
        total_potential_payout: 0, 
        overall_risk_percentage: 0, 
        high_risk_numbers: [], 
        medium_risk_numbers: [], 
        safe_numbers: [],
        portfolioVolatility: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        var95: 0,
        concentrationIndex: 0
      });
    } finally {
      setLoading(false);
    }
  }, [lottery_sub_type_id, selectedDate, riskThreshold]);

  return { analysis, loading, fetchSalesAnalysis };
} 