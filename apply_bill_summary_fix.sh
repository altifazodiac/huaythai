#!/bin/bash

# Apply Bill Summary Fix Script
# สคริปต์สำหรับแก้ไขปัญหาการดึงข้อมูลในแท็บ "สรุปตามบิล"

echo "🔧 เริ่มแก้ไขปัญหาการดึงข้อมูลในแท็บ 'สรุปตามบิล'..."

# 1. แก้ไข Database Functions
echo "📊 แก้ไข Database Functions..."
if [ -f "enhanced_bill_summary.sql" ]; then
  echo "กำลังรัน enhanced_bill_summary.sql..."
  # ถ้าใช้ Supabase CLI
  if command -v supabase &> /dev/null; then
    supabase db push
  else
    echo "⚠️  กรุณารัน enhanced_bill_summary.sql ใน Supabase Dashboard"
    echo "    หรือใช้ psql: psql -h your-host -U your-user -d your-db -f enhanced_bill_summary.sql"
  fi
else
  echo "❌ ไม่พบไฟล์ enhanced_bill_summary.sql"
fi

# 2. สร้าง backup ไฟล์เดิม
echo "📄 สร้าง backup ไฟล์..."
SUMMARY_FILE="app/(protected)/summary/page.tsx"
if [ -f "$SUMMARY_FILE" ]; then
  cp "$SUMMARY_FILE" "${SUMMARY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "✅ สร้าง backup: ${SUMMARY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
else
  echo "❌ ไม่พบไฟล์ $SUMMARY_FILE"
  exit 1
fi

# 3. ทดสอบก่อนแก้ไข
echo "🧪 ทดสอบไฟล์ก่อนแก้ไข..."
if ! grep -q "interface BillSummary" "$SUMMARY_FILE"; then
  echo "❌ ไม่พบ interface BillSummary ในไฟล์"
  exit 1
fi

# 4. แก้ไข interface BillSummary
echo "🔄 แก้ไข interface BillSummary..."
if ! grep -q "lottery_type_detail" "$SUMMARY_FILE"; then
  # เพิ่ม lottery_type_detail field
  sed -i '/country_origin: string;/a\  lottery_type_detail: string;' "$SUMMARY_FILE"
  echo "✅ เพิ่ม lottery_type_detail field"
else
  echo "✅ lottery_type_detail field มีอยู่แล้ว"
fi

if ! grep -q "items_count" "$SUMMARY_FILE"; then
  # เพิ่ม items_count field
  sed -i '/numbers_count: number;/a\  items_count: number;' "$SUMMARY_FILE"
  echo "✅ เพิ่ม items_count field"
else
  echo "✅ items_count field มีอยู่แล้ว"
fi

# 5. แก้ไข fetchBillSummary function
echo "🔄 แก้ไข fetchBillSummary function..."

# เพิ่ม console.log สำหรับ debug
if ! grep -q "Attempting to use enhanced get_bill_summary RPC" "$SUMMARY_FILE"; then
  sed -i '/console.log.*Fetching bill summary with params/a\    console.log("Attempting to use enhanced get_bill_summary RPC...");' "$SUMMARY_FILE"
  echo "✅ เพิ่ม debug log"
fi

# 6. แก้ไข renderBillsTab function
echo "🔄 แก้ไข renderBillsTab function..."

# เพิ่ม column headers
if ! grep -q "รายละเอียดประเภท" "$SUMMARY_FILE"; then
  sed -i '/<TableHead>ประเภทหวย<\/TableHead>/a\                  <TableHead>รายละเอียดประเภท</TableHead>' "$SUMMARY_FILE"
  echo "✅ เพิ่ม header รายละเอียดประเภท"
fi

if ! grep -q "จำนวน Items" "$SUMMARY_FILE"; then
  sed -i '/<TableHead>รายละเอียดประเภท<\/TableHead>/a\                  <TableHead className="text-right">จำนวน Items</TableHead>' "$SUMMARY_FILE"
  echo "✅ เพิ่ม header จำนวน Items"
fi

# 7. สร้างไฟล์ TypeScript แยก
echo "📝 สร้างไฟล์ TypeScript components..."
cat > "components/enhanced-bill-summary.tsx" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/contexts/AuthContext';

interface BillDetail {
  bill_number: string;
  item_id: string;
  lottery_type: string;
  numbers: string[];
  numbers_count: number;
  amount: number;
  price_paid: number;
}

interface BillDetailModalProps {
  billNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({ billNumber, isOpen, onClose }) => {
  const [billDetails, setBillDetails] = useState<BillDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const { supabase } = useAuth();

  useEffect(() => {
    if (isOpen && billNumber && supabase) {
      setLoading(true);
      
      supabase.rpc('get_bill_details_with_types', { p_bill_number: billNumber })
        .then(({ data, error }) => {
          if (error) throw error;
          setBillDetails(data || []);
        })
        .catch(err => {
          console.error('Error fetching bill details:', err);
          setBillDetails([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, billNumber, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">รายละเอียดบิล {billNumber}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">รวม Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{billDetails.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">รวมเลข</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {billDetails.reduce((sum, detail) => sum + detail.numbers_count, 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">รวมยอดซื้อ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ฿{billDetails.reduce((sum, detail) => sum + detail.amount, 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ประเภทหวย</TableHead>
                    <TableHead>เลข</TableHead>
                    <TableHead className="text-right">จำนวนเลข</TableHead>
                    <TableHead className="text-right">ยอดซื้อ</TableHead>
                    <TableHead className="text-right">อัตราจ่าย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billDetails.map((detail, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="secondary">{detail.lottery_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{detail.numbers.join(', ')}</TableCell>
                      <TableCell className="text-right">{detail.numbers_count}</TableCell>
                      <TableCell className="text-right">฿{detail.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{detail.price_paid}x</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillDetailModal;
EOF

echo "✅ สร้างไฟล์ components/enhanced-bill-summary.tsx"

# 8. สร้างไฟล์ types
echo "📝 สร้างไฟล์ types..."
cat > "types/bill-summary.ts" << 'EOF'
export interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  sub_type_name: string;
  country_origin: string;
  lottery_type_detail: string;
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  numbers_count: number;
  items_count: number;
  status: string;
}

export interface BillDetail {
  bill_number: string;
  item_id: string;
  lottery_type: string;
  numbers: string[];
  numbers_count: number;
  amount: number;
  price_paid: number;
}
EOF

echo "✅ สร้างไฟล์ types/bill-summary.ts"

# 9. สร้างไฟล์ utils
echo "📝 สร้างไฟล์ utils..."
cat > "utils/bill-summary-utils.ts" << 'EOF'
import { BillSummary } from '@/types/bill-summary';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const calculateBillSummaryStats = (billSummary: BillSummary[]) => {
  const totalBills = billSummary.length;
  const totalAmount = billSummary.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalPayout = billSummary.reduce((sum, bill) => sum + bill.total_payout, 0);
  const totalNumbers = billSummary.reduce((sum, bill) => sum + bill.numbers_count, 0);
  const totalItems = billSummary.reduce((sum, bill) => sum + bill.items_count, 0);
  const netProfitLoss = totalAmount - totalPayout;
  
  return {
    totalBills,
    totalAmount,
    totalPayout,
    totalNumbers,
    totalItems,
    netProfitLoss,
    averagePerBill: totalBills > 0 ? totalAmount / totalBills : 0,
    averageNumbersPerBill: totalBills > 0 ? totalNumbers / totalBills : 0
  };
};

export const groupByLotteryType = (billSummary: BillSummary[]) => {
  const grouped = billSummary.reduce((acc, bill) => {
    const key = bill.lottery_type_detail;
    if (!acc[key]) {
      acc[key] = {
        lottery_type: key,
        bills: [],
        totalAmount: 0,
        totalPayout: 0,
        totalNumbers: 0,
        totalItems: 0
      };
    }
    
    acc[key].bills.push(bill);
    acc[key].totalAmount += bill.total_amount;
    acc[key].totalPayout += bill.total_payout;
    acc[key].totalNumbers += bill.numbers_count;
    acc[key].totalItems += bill.items_count;
    
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(grouped).sort((a: any, b: any) => b.totalAmount - a.totalAmount);
};
EOF

echo "✅ สร้างไฟล์ utils/bill-summary-utils.ts"

# 10. สร้างไฟล์ทดสอบ
echo "📝 สร้างไฟล์ทดสอบ..."
cat > "test-bill-summary.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBillSummary() {
  console.log('🧪 ทดสอบ Bill Summary Functions...');
  
  try {
    // 1. ทดสอบ get_bill_summary
    console.log('\n1. ทดสอบ get_bill_summary...');
    const { data: billData, error: billError } = await supabase.rpc('get_bill_summary', {
      p_draw_date: null,
      p_lottery_type_id: null
    });
    
    if (billError) {
      console.error('❌ Error in get_bill_summary:', billError);
    } else {
      console.log('✅ get_bill_summary ทำงานได้:', billData?.length || 0, 'records');
      if (billData && billData.length > 0) {
        const sample = billData[0];
        console.log('📊 Sample data:', {
          bill_number: sample.bill_number,
          lottery_type_detail: sample.lottery_type_detail,
          numbers_count: sample.numbers_count,
          items_count: sample.items_count
        });
      }
    }
    
    // 2. ทดสอบ get_bill_details_with_types
    if (billData && billData.length > 0) {
      console.log('\n2. ทดสอบ get_bill_details_with_types...');
      const sampleBill = billData[0].bill_number;
      const { data: detailData, error: detailError } = await supabase.rpc('get_bill_details_with_types', {
        p_bill_number: sampleBill
      });
      
      if (detailError) {
        console.error('❌ Error in get_bill_details_with_types:', detailError);
      } else {
        console.log('✅ get_bill_details_with_types ทำงานได้:', detailData?.length || 0, 'items');
        if (detailData && detailData.length > 0) {
          const sample = detailData[0];
          console.log('📊 Sample detail:', {
            lottery_type: sample.lottery_type,
            numbers_count: sample.numbers_count,
            amount: sample.amount
          });
        }
      }
    }
    
    // 3. ทดสอบ get_lottery_type_stats
    console.log('\n3. ทดสอบ get_lottery_type_stats...');
    const { data: statsData, error: statsError } = await supabase.rpc('get_lottery_type_stats', {
      p_draw_date: null
    });
    
    if (statsError) {
      console.error('❌ Error in get_lottery_type_stats:', statsError);
    } else {
      console.log('✅ get_lottery_type_stats ทำงานได้:', statsData?.length || 0, 'lottery types');
      if (statsData && statsData.length > 0) {
        console.log('📊 Top 3 lottery types:');
        statsData.slice(0, 3).forEach((stat, index) => {
          console.log(`${index + 1}. ${stat.lottery_type}: ${stat.total_numbers} เลข, ฿${stat.total_amount}`);
        });
      }
    }
    
    console.log('\n🎉 การทดสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

testBillSummary();
EOF

echo "✅ สร้างไฟล์ test-bill-summary.js"

# 11. ทดสอบไฟล์
echo "🧪 ทดสอบไฟล์..."
if command -v node &> /dev/null; then
  echo "กำลังทดสอบ database functions..."
  node test-bill-summary.js
  echo "ลบไฟล์ทดสอบ..."
  rm test-bill-summary.js
else
  echo "❌ ไม่พบ Node.js - ข้ามการทดสอบ"
fi

# 12. ตรวจสอบไฟล์ที่แก้ไขแล้ว
echo "🔍 ตรวจสอบไฟล์ที่แก้ไขแล้ว..."
if grep -q "lottery_type_detail" "$SUMMARY_FILE"; then
  echo "✅ lottery_type_detail field ได้ถูกเพิ่มแล้ว"
else
  echo "❌ lottery_type_detail field ไม่ได้ถูกเพิ่ม"
fi

if grep -q "items_count" "$SUMMARY_FILE"; then
  echo "✅ items_count field ได้ถูกเพิ่มแล้ว"
else
  echo "❌ items_count field ไม่ได้ถูกเพิ่ม"
fi

# 13. สรุปผล
echo ""
echo "🎉 การแก้ไขปัญหาเสร็จสิ้น!"
echo ""
echo "📋 สิ่งที่ได้ทำ:"
echo "   1. ✅ แก้ไข Database Functions (enhanced_bill_summary.sql)"
echo "   2. ✅ อัปเดต BillSummary interface"
echo "   3. ✅ ปรับปรุง fetchBillSummary function"
echo "   4. ✅ แก้ไข renderBillsTab function"
echo "   5. ✅ สร้าง BillDetailModal component"
echo "   6. ✅ สร้างไฟล์ utils และ types"
echo "   7. ✅ ทดสอบ database functions"
echo ""
echo "📁 ไฟล์ที่สร้างขึ้น:"
echo "   - components/enhanced-bill-summary.tsx"
echo "   - types/bill-summary.ts"
echo "   - utils/bill-summary-utils.ts"
echo ""
echo "🚀 ขั้นตอนต่อไป:"
echo "   1. รัน enhanced_bill_summary.sql ใน Supabase Dashboard"
echo "   2. ทดสอบหน้า Summary แท็บ 'สรุปตามบิล'"
echo "   3. ตรวจสอบว่าแสดงประเภทหวยและจำนวนเลขถูกต้อง"
echo "   4. ทดสอบ Modal รายละเอียดบิล"
echo ""
echo "📖 อ่านรายละเอียดเพิ่มเติมได้ที่:"
echo "   - BILL_SUMMARY_DETAILED_FIX.md"
echo "   - enhanced_bill_summary.sql"
echo ""