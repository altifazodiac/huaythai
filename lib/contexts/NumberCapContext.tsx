"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';

interface ManagedNumber {
  number: string;
  digit_count: number;
  type_number: string;
  action: 'half' | 'close';
  reason: string;
  is_manual: boolean;
  lottery_sub_type_id: number;
  draw_date: string;
  risk_percentage?: number;
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

interface NumberCapContextType {
  managedNumbers: ManagedNumber[];
  setManagedNumbers: (numbers: ManagedNumber[]) => void;
  addManagedNumber: (number: ManagedNumber) => Promise<void>;
  removeManagedNumber: (numberKey: string) => Promise<void>;
  checkNumberStatus: (number: string, digitCount: number, typeNumber: string, subTypeId: number) => ManagedNumber | null;
  fetchManagedNumbers: (subTypeId: number, drawDate: string) => Promise<void>;
  updateManagedNumbersForSubType: (subTypeId: number, drawDate: string, numbers: ManagedNumber[]) => Promise<void>;
  numberAnalysis: Record<string, NumberSalesData>;
  setNumberAnalysis: (analysis: Record<string, NumberSalesData>) => void;
}

const NumberCapContext = createContext<NumberCapContextType | undefined>(undefined);

export const NumberCapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [managedNumbers, setManagedNumbers] = useState<ManagedNumber[]>([]);
  const [numberAnalysis, setNumberAnalysis] = useState<Record<string, NumberSalesData>>({});

  const addManagedNumber = async (number: ManagedNumber) => {
    try {
      // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
      const { data: existingData, error: checkError } = await supabase
        .from('managed_numbers')
        .select('id')
        .eq('lottery_sub_type_id', number.lottery_sub_type_id)
        .eq('number', number.number)
        .eq('digit_count', number.digit_count)
        .eq('type_number', number.type_number)
        .eq('draw_date', number.draw_date)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing managed number:', checkError);
        throw new Error(`ไม่สามารถตรวจสอบข้อมูลเลขอั้นได้: ${checkError.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
      }

      let data, error;
      if (existingData) {
        // อัปเดตข้อมูลที่มีอยู่
        const result = await supabase
          .from('managed_numbers')
          .update({
            action: number.action,
            reason: number.reason,
            is_manual: number.is_manual,
            risk_percentage: number.risk_percentage
          })
          .eq('id', existingData.id);
        
        data = result.data;
        error = result.error;
      } else {
        // เพิ่มข้อมูลใหม่
        const result = await supabase
          .from('managed_numbers')
          .insert({
            lottery_sub_type_id: number.lottery_sub_type_id,
            number: number.number,
            digit_count: number.digit_count,
            type_number: number.type_number,
            action: number.action,
            reason: number.reason,
            is_manual: number.is_manual,
            draw_date: number.draw_date,
            risk_percentage: number.risk_percentage
          });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error saving managed number:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // แสดง error ที่เป็นมิตรกับผู้ใช้
        throw new Error(`ไม่สามารถบันทึกเลขอั้นได้: ${error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
      }

      console.log('DEBUG: [NumberCapContext] upsert success:', data);

      // ดึงข้อมูลล่าสุดจากฐานข้อมูล
      await fetchManagedNumbers(number.lottery_sub_type_id, number.draw_date);
    } catch (error) {
      console.error('Error in addManagedNumber:', error);
      throw error;
    }
  };

  const removeManagedNumber = async (numberKey: string) => {
    try {
      const parts = numberKey.split('-');
      if (parts.length < 3) {
        console.error('Invalid numberKey for removal:', numberKey);
        throw new Error('ข้อมูลสำหรับลบไม่ถูกต้อง');
      }
      
      const number = parts[0];
      const digit_count = parseInt(parts[1], 10);
      const type_number = parts[2];

      // Find the specific managed number in the state to get all its properties, including draw_date and sub_type_id
      const numberToRemove = managedNumbers.find(n => 
        n.number === number && 
        n.digit_count === digit_count && 
        n.type_number === type_number
      );

      if (!numberToRemove) {
        console.warn('Could not find number to remove in context state:', numberKey);
        // Force a state update to remove it from the view anyway
        setManagedNumbers(prev => prev.filter(n => `${n.number}-${n.digit_count}-${n.type_number}` !== numberKey));
        return;
      }
      
      const { lottery_sub_type_id, draw_date } = numberToRemove;

      console.log('DEBUG: [NumberCapContext] removeManagedNumber:', {
        number,
        digit_count,
        type_number,
        lottery_sub_type_id,
        draw_date,
      });

      const { error } = await supabase
        .from('managed_numbers')
        .delete()
        .eq('number', number)
        .eq('digit_count', digit_count)
        .eq('type_number', type_number)
        .eq('lottery_sub_type_id', lottery_sub_type_id)
        .eq('draw_date', draw_date);

      if (error) {
        console.error('Error deleting managed number:', error);
        throw new Error(`ไม่สามารถลบเลขอั้นได้: ${error.message}`);
      }

      console.log('DEBUG: [NumberCapContext] delete success');

      // Update state locally for faster UI response
      setManagedNumbers(prev => prev.filter(n => 
        !(n.number === number && 
          n.digit_count === digit_count && 
          n.type_number === type_number && 
          n.lottery_sub_type_id === lottery_sub_type_id &&
          n.draw_date === draw_date)
      ));
      
    } catch (error) {
      console.error('Error removing managed number:', error);
      throw error;
    }
  };

  const checkNumberStatus = (number: string, digitCount: number, typeNumber: string, subTypeId: number): ManagedNumber | null => {
    return managedNumbers.find(n => 
      n.number === number && 
      n.digit_count === digitCount && 
      n.type_number === typeNumber &&
      n.lottery_sub_type_id === subTypeId
    ) || null;
  };

  const fetchManagedNumbers = useCallback(async (subTypeId: number, drawDate: string) => {
    try {
      console.log('DEBUG: [NumberCapContext] fetchManagedNumbers:', { subTypeId, drawDate });
      
      const { data, error } = await supabase
        .from('managed_numbers')
        .select('*')
        .eq('lottery_sub_type_id', subTypeId)
        .eq('draw_date', drawDate);

      if (error) {
        console.error('Error fetching managed numbers:', error);
        throw new Error(`ไม่สามารถดึงข้อมูลเลขอั้นได้: ${error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
      }

      const managedNumbersData = data || [];
      console.log('DEBUG: [NumberCapContext] fetched managed numbers:', managedNumbersData.length, 'items');
      
      if (managedNumbersData.length > 0) {
        console.log('DEBUG: [NumberCapContext] sample data:', managedNumbersData[0]);
      }
      
      setManagedNumbers(managedNumbersData);
    } catch (error) {
      console.error('Error fetching managed numbers:', error);
      // Set empty array on error to prevent undefined state
      setManagedNumbers([]);
      throw error;
    }
  }, []);

  const updateManagedNumbersForSubType = useCallback(async (subTypeId: number, drawDate: string, numbers: ManagedNumber[]) => {
    try {
      console.log('DEBUG: [NumberCapContext] updateManagedNumbersForSubType:', { subTypeId, drawDate, numbersCount: numbers.length });
      
      // ลบเลขเก่าของ subType และ drawDate นี้
      const { error: deleteError } = await supabase
        .from('managed_numbers')
        .delete()
        .eq('lottery_sub_type_id', subTypeId)
        .eq('draw_date', drawDate);

      if (deleteError) {
        console.error('Error deleting old managed numbers:', {
          error: deleteError,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code
        });
        throw new Error(`ไม่สามารถลบเลขอั้นเก่าได้: ${deleteError.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
      }

      // เพิ่มเลขใหม่ (ใช้ upsert)
      if (numbers.length > 0) {
        // log ข้อมูลที่กำลังจะ upsert
        console.log('DEBUG: [NumberCapContext] Upserting managed numbers:', numbers);

        // ตรวจสอบข้อมูลก่อนส่งเข้า upsert
        const validNumbers = numbers.filter(n =>
          n.lottery_sub_type_id && n.number && n.digit_count && n.type_number && n.action && n.draw_date
        );
        if (validNumbers.length !== numbers.length) {
          console.error('พบข้อมูลไม่ครบในบางรายการ:', numbers);
        }

        const { error: upsertError, data } = await supabase
          .from('managed_numbers')
          .insert(
            validNumbers.map(n => ({
              lottery_sub_type_id: n.lottery_sub_type_id,
              number: n.number,
              digit_count: n.digit_count,
              type_number: n.type_number,
              action: n.action,
              reason: n.reason,
              is_manual: n.is_manual,
              draw_date: n.draw_date,
              risk_percentage: n.risk_percentage
            }))
          );

        if (upsertError) {
          console.error('Error upserting managed numbers:', {
            error: upsertError,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            code: upsertError.code,
            data: data
          });
          throw new Error(`ไม่สามารถเพิ่มเลขอั้นใหม่ได้: ${upsertError.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`);
        }
        
        console.log('DEBUG: [NumberCapContext] upsert success:', data);
      }

      // ดึงข้อมูลล่าสุด
      await fetchManagedNumbers(subTypeId, drawDate);
    } catch (error) {
      console.error('Error updating managed numbers:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }, [fetchManagedNumbers]);

  return (
    <NumberCapContext.Provider value={{
      managedNumbers,
      setManagedNumbers,
      addManagedNumber,
      removeManagedNumber,
      checkNumberStatus,
      fetchManagedNumbers,
      updateManagedNumbersForSubType,
      numberAnalysis,
      setNumberAnalysis,
    }}>
      {children}
    </NumberCapContext.Provider>
  );
};

// Enhanced hook with additional utilities
export const useNumberCap = () => {
  const context = useContext(NumberCapContext);
  if (context === undefined) {
    throw new Error('useNumberCap must be used within a NumberCapProvider');
  }

  // Additional utility functions for universal lottery support
  const getNumberCapsBySubType = (subTypeId: number, drawDate: string) => {
    return context.managedNumbers.filter(
      n => n.lottery_sub_type_id === subTypeId && n.draw_date === drawDate
    );
  };

  const getNumberCapStatsBySubType = (subTypeId: number, drawDate: string) => {
    const numbers = getNumberCapsBySubType(subTypeId, drawDate);
    return {
      total: numbers.length,
      half: numbers.filter(n => n.action === 'half').length,
      close: numbers.filter(n => n.action === 'close').length,
      manual: numbers.filter(n => n.is_manual).length,
      auto: numbers.filter(n => !n.is_manual).length,
      sampleNumbers: numbers.slice(0, 3).map(n => n.number)
    };
  };

  const isUniversalNumberCapped = (number: string, digitCount: number, typeNumber: string, subTypeId: number, drawDate: string) => {
    return context.managedNumbers.some(
      n => n.number === number && 
           n.digit_count === digitCount && 
           n.type_number === typeNumber &&
           n.lottery_sub_type_id === subTypeId &&
           n.draw_date === drawDate
    );
  };

  const getUniversalNumberCapAction = (
    number: string,
    digitCount: number,
    typeNumber: string,
    subTypeId: number,
    drawDate: string
  ): ManagedNumber | null => {
    // ลด debug logs โดยแสดงเฉพาะเมื่อพบข้อมูล
    const found = context.managedNumbers.find(
      (n) =>
        n.number === number &&
        n.digit_count === digitCount &&
        n.type_number === typeNumber &&
        n.lottery_sub_type_id === subTypeId &&
        n.draw_date === drawDate
    );

    // แสดง debug เฉพาะเมื่อพบข้อมูลหรือมีปัญหา
    if (found || context.managedNumbers.length === 0) {
      console.log('DEBUG: [NumberCapContext]', { 
        number, digitCount, typeNumber, subTypeId, drawDate, 
        managedCount: context.managedNumbers.length, 
        found: found ? found.action : 'not found' 
      });
    }

    return found || null;
  };

  return {
    ...context,
    getNumberCapsBySubType,
    getNumberCapStatsBySubType,
    isUniversalNumberCapped,
    getUniversalNumberCapAction
  };
}; 