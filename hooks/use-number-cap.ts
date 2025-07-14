import { useMemo } from 'react';
import { useNumberCap } from '@/lib/contexts/NumberCapContext';

interface UseNumberCapForOrdersProps {
  subTypeId: number;
  drawDate: string;
  enabled?: boolean;
}

export function useNumberCapForOrders({ 
  subTypeId, 
  drawDate, 
  enabled = true 
}: UseNumberCapForOrdersProps) {
  const { managedNumbers, checkNumberStatus } = useNumberCap();

  // Filter managed numbers for current context
  const relevantNumbers = useMemo(() => {
    if (!enabled) return [];
    return managedNumbers.filter(n => 
      n.lottery_sub_type_id === subTypeId && n.draw_date === drawDate
    );
  }, [managedNumbers, subTypeId, drawDate, enabled]);

  // Statistics
  const stats = useMemo(() => {
    const halfNumbers = relevantNumbers.filter(n => n.action === 'half');
    const closedNumbers = relevantNumbers.filter(n => n.action === 'close');
    const manualNumbers = relevantNumbers.filter(n => n.is_manual);
    const analysisNumbers = relevantNumbers.filter(n => !n.is_manual);

    return {
      total: relevantNumbers.length,
      half: halfNumbers.length,
      closed: closedNumbers.length,
      manual: manualNumbers.length,
      analysis: analysisNumbers.length,
      halfNumbers,
      closedNumbers,
    };
  }, [relevantNumbers]);

  // Check if number is managed
  const isNumberManaged = (number: string, digitCount: number, typeNumber: string) => {
    if (!enabled) return false;
    return checkNumberStatus(number, digitCount, typeNumber, subTypeId) !== null;
  };

  // Get number status
  const getNumberStatus = (number: string, digitCount: number, typeNumber: string) => {
    if (!enabled) return null;
    return checkNumberStatus(number, digitCount, typeNumber, subTypeId);
  };

  // Calculate adjusted price based on number cap status
  const calculateAdjustedPrice = (
    number: string, 
    digitCount: number, 
    typeNumber: string, 
    originalPrice: number
  ) => {
    if (!enabled) return originalPrice;
    
    const status = getNumberStatus(number, digitCount, typeNumber);
    if (status?.action === 'half') {
      return Math.floor(originalPrice / 2);
    }
    return originalPrice;
  };

  // Check if number should be blocked
  const isNumberBlocked = (number: string, digitCount: number, typeNumber: string) => {
    if (!enabled) return false;
    
    const status = getNumberStatus(number, digitCount, typeNumber);
    return status?.action === 'close';
  };

  return {
    relevantNumbers,
    stats,
    isNumberManaged,
    getNumberStatus,
    calculateAdjustedPrice,
    isNumberBlocked,
    hasNumberCap: relevantNumbers.length > 0,
  };
} 