"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Scissors, Ban, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { toast } from 'sonner';

interface NumberCapIndicatorProps {
  lottery_sub_type_id: number;
  drawDate: string;
  showStats?: boolean;
  lotterySubTypeName?: string;
}

interface ManagedNumber {
  number: string;
  digit_count: number;
  type_number: string;
  action: 'half' | 'close';
  reason: string;
  is_manual: boolean;
}

export default function NumberCapIndicator({ lottery_sub_type_id, drawDate, showStats = true, lotterySubTypeName }: NumberCapIndicatorProps) {
  const [managedNumbers, setManagedNumbers] = useState<ManagedNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch managed numbers for current subtype and draw date
  useEffect(() => {
    const fetchManagedNumbers = async () => {
      if (!lottery_sub_type_id || !drawDate) return;
      
      setLoading(true);
      setError(null);
      try {
        console.log('NumberCapIndicator: fetching for', { lottery_sub_type_id, drawDate });
        
        const { data, error } = await supabase
          .from('managed_numbers')
          .select('*')
          .eq('lottery_sub_type_id', lottery_sub_type_id)
          .eq('draw_date', drawDate);

        if (error) {
          console.error('Error fetching managed numbers:', error);
          setError(error.message);
          return;
        }

        const formattedData: ManagedNumber[] = data?.map(item => ({
          number: item.number,
          digit_count: item.digit_count,
          type_number: item.type_number,
          action: item.action as 'half' | 'close',
          reason: item.reason,
          is_manual: item.is_manual
        })) || [];

        console.log('NumberCapIndicator: fetched', formattedData.length, 'managed numbers');
        setManagedNumbers(formattedData);

        // แสดงการแจ้งเตือนเมื่อมีเลขอั้น
        if (formattedData.length > 0) {
          const closeCount = formattedData.filter(n => n.action === 'close').length;
          const halfCount = formattedData.filter(n => n.action === 'half').length;
          
          if (closeCount > 0) {
            toast.warning(`🚫 มีเลขปิดรับ ${closeCount} เลข สำหรับ ${lotterySubTypeName || 'หวยนี้'}`, { 
              duration: 4000,
              description: `วันที่ ${drawDate}`
            });
          }
          
          if (halfCount > 0) {
            toast.info(`✂️ มีเลขหารครึ่ง ${halfCount} เลข สำหรับ ${lotterySubTypeName || 'หวยนี้'}`, { 
              duration: 3000,
              description: `วันที่ ${drawDate}`
            });
          }
        }
      } catch (error) {
        console.error('Error fetching managed numbers:', error);
        setError('ไม่สามารถดึงข้อมูลเลขอั้นได้');
      } finally {
        setLoading(false);
      }
    };

    fetchManagedNumbers();
  }, [lottery_sub_type_id, drawDate, lotterySubTypeName]);

  const halfNumbers = managedNumbers.filter(n => n.action === 'half');
  const closedNumbers = managedNumbers.filter(n => n.action === 'close');
  const manualNumbers = managedNumbers.filter(n => n.is_manual);
  const analysisNumbers = managedNumbers.filter(n => !n.is_manual);

  // แสดง error state
  if (error) {
    return (
      <Card className="mb-4 border-red-200 bg-red-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">เกิดข้อผิดพลาด: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // แสดง loading state
  if (loading) {
    return (
      <Card className="mb-4 border-gray-200 bg-gray-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Info className="h-4 w-4 animate-spin" />
            <span className="text-sm">กำลังโหลดข้อมูลเลขอั้น...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ไม่แสดงอะไรถ้าไม่มีข้อมูลและไม่ต้องการแสดง stats
  if (!showStats || managedNumbers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          ระบบเลขอั้น{lotterySubTypeName ? ` - ${lotterySubTypeName}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Scissors className="h-3 w-3 text-orange-600" />
            <span>หารครึ่ง: </span>
            <Badge variant="outline" className="bg-orange-100 text-orange-700">
              {halfNumbers.length} เลข
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Ban className="h-3 w-3 text-red-600" />
            <span>ปิดรับ: </span>
            <Badge variant="outline" className="bg-red-100 text-red-700">
              {closedNumbers.length} เลข
            </Badge>
          </div>
          <div className="text-gray-600">
            (วิเคราะห์: {analysisNumbers.length}, ด้วยตนเอง: {manualNumbers.length})
          </div>
        </div>
        
        {/* แสดงรายการเลขอั้นแบบย่อ */}
        <div className="mt-2 space-y-1">
          {halfNumbers.length > 0 && (
            <div className="text-xs">
              <span className="font-medium text-orange-700">หารครึ่ง: </span>
              <span className="text-orange-600">
                {halfNumbers.slice(0, 5).map(n => n.number).join(', ')}
                {halfNumbers.length > 5 && ` และอีก ${halfNumbers.length - 5} เลข`}
              </span>
            </div>
          )}
          {closedNumbers.length > 0 && (
            <div className="text-xs">
              <span className="font-medium text-red-700">ปิดรับ: </span>
              <span className="text-red-600">
                {closedNumbers.slice(0, 5).map(n => n.number).join(', ')}
                {closedNumbers.length > 5 && ` และอีก ${closedNumbers.length - 5} เลข`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 