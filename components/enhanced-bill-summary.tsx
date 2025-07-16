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
