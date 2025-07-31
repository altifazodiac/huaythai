import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export function NumberCapTable({ title, numbers, selectedNumbers, onSelect, managedNumbers, getRiskBadgeColor, formatCurrency, formatPercentage, icon, cardClass }) {
  if (!numbers || numbers.length === 0) return null;
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-2">{icon}{title} ({numbers.length} เลข)</div>
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
              <th className="text-center p-2">ผลลัพธ์</th>
              <th className="text-center p-2">ประสิทธิภาพ</th>
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
                    <Checkbox checked={isSelected} disabled={isManaged} onCheckedChange={() => onSelect(numberKey)} />
                  </td>
                  <td className="p-2 font-mono font-bold">{number.number}</td>
                  <td className="p-2">{number.digit_count} ตัว{number.type_number}</td>
                  <td className="p-2 text-right">{formatCurrency(number.total_sales)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(number.potential_payout)}</td>
                  <td className="p-2 text-right"><Badge variant={getRiskBadgeColor(number.risk_percentage)}>{formatPercentage(number.risk_percentage)}</Badge></td>
                  <td className="p-2 text-center">{number.total_bets}</td>
                  <td className="p-2 text-center">
                    {number.isWinning !== undefined && (
                      <Badge variant={number.isWinning ? "destructive" : "secondary"}>
                        {number.isWinning ? "❌ ถูก" : "✅ ไม่ถูก"}
                      </Badge>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {number.accuracyScore !== undefined && (
                      <div className="text-xs">
                        <div className={`font-bold ${
                          number.accuracyScore >= 80 ? 'text-green-600 dark:text-green-400' : 
                          number.accuracyScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                          number.accuracyScore >= 40 ? 'text-orange-600 dark:text-orange-400' : 
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {number.accuracyScore.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {number.accuracyScore >= 80 ? 'จัดการดี' : 
                           number.accuracyScore >= 60 ? 'พอใช้' : 
                           number.accuracyScore >= 40 ? 'ต้องปรับ' : 'ต้องแก้ไข'}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 