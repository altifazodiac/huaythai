// Enhanced Summary Page Components
// ส่วนที่ต้องแก้ไขในไฟล์ app/(protected)/summary/page.tsx

// 1. อัปเดต interface BillSummary
interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  sub_type_name: string;
  country_origin: string;
  lottery_type_detail: string;  // เพิ่มฟิลด์ใหม่
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  numbers_count: number;
  items_count: number;  // เพิ่มฟิลด์ใหม่
  status: string;
}

// 2. แก้ไข fetchBillSummary function
const fetchBillSummary = async (supabase: any, drawDate?: string, lotteryTypeId?: number): Promise<BillSummary[]> => {
  try {
    console.log('Fetching bill summary with params:', { drawDate, lotteryTypeId });
    
    // Try RPC function first
    const params: any = {};
    if (drawDate) params.p_draw_date = drawDate;
    if (lotteryTypeId) params.p_lottery_type_id = lotteryTypeId;
    
    const { data, error } = await supabase.rpc('get_bill_summary', params);
    
    if (!error && data) {
      const filtered = (data as BillSummary[]).filter((b: BillSummary) => b.status === 'confirmed');
      console.log('Received enhanced bill summary data:', filtered);
      return filtered;
    }
    
    // Enhanced fallback to direct SQL query
    console.log('RPC function failed, using enhanced direct query fallback');
    
    // Get tickets (force confirmed only)
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, total_amount, status, user_id')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get user profiles
    const userIds = [...new Set(tickets.map((t: any) => t.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, full_name')
      .in('id', userIds);
    
    if (profileError) throw profileError;
    
    // Get ticket items with detailed information including lottery_sub_number
    const ticketIds = tickets.map((t: any) => t.id);
    let itemQuery = supabase
      .from('lottery_ticket_items')
      .select(`
        id,
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_number_id,
        numbers,
        amount,
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        ),
        lottery_sub_number!inner(
          id,
          digit_number,
          type_number,
          price_paid
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (lotteryTypeId) {
      itemQuery = itemQuery.eq('lottery_sub_type_id', lotteryTypeId);
    }
    
    const { data: ticketItems, error: itemError } = await itemQuery;
    if (itemError) throw itemError;
    
    // Group items by ticket_id with detailed processing
    const itemsByTicket = (ticketItems || []).reduce((acc: any, item: any) => {
      if (!acc[item.ticket_id]) {
        acc[item.ticket_id] = {
          items: [],
          totalNumbers: 0,
          lotteryTypes: new Set(),
          subTypeName: '',
          countryOrigin: ''
        };
      }
      
      // Count actual numbers in this item
      const numbersCount = item.numbers ? item.numbers.length : 0;
      acc[item.ticket_id].totalNumbers += numbersCount;
      
      // Add lottery type info
      const lotteryType = `${item.lottery_sub_number.digit_number} ตัว${item.lottery_sub_number.type_number}`;
      acc[item.ticket_id].lotteryTypes.add(lotteryType);
      
      // Store sub type info from first item
      if (acc[item.ticket_id].items.length === 0) {
        acc[item.ticket_id].subTypeName = item.lottery_sub_types.sub_type_name;
        acc[item.ticket_id].countryOrigin = item.lottery_sub_types.country_origin;
      }
      
      acc[item.ticket_id].items.push({
        ...item,
        lotteryType: lotteryType,
        numbersCount: numbersCount
      });
      
      return acc;
    }, {});
    
    // Get winning amounts
    const { data: winnings, error: winningsError } = await supabase
      .from('lottery_winnings')
      .select('ticket_item_id, winning_amount')
      .in('ticket_item_id', (ticketItems || []).map((item: any) => item.id));
    
    if (winningsError) console.warn('Warning: Could not fetch winnings data:', winningsError);
    
    // Create winnings lookup
    const winningsLookup = (winnings || []).reduce((acc: any, win: any) => {
      acc[win.ticket_item_id] = (acc[win.ticket_item_id] || 0) + Number(win.winning_amount || 0);
      return acc;
    }, {});
    
    // Transform data to match expected format
    const transformedData = tickets.map((ticket: any) => {
      const ticketData = itemsByTicket[ticket.id] || { 
        items: [], 
        totalNumbers: 0, 
        lotteryTypes: new Set(),
        subTypeName: 'ไม่ระบุ',
        countryOrigin: 'ไม่ระบุ'
      };
      
      const profile = profiles?.find((p: any) => p.id === ticket.user_id);
      
      // Create detailed lottery type description
      const lotteryTypesArray = Array.from(ticketData.lotteryTypes);
      const lotteryTypeDescription = lotteryTypesArray.length > 1 
        ? `${lotteryTypesArray.join(', ')} (${lotteryTypesArray.length} ประเภท)`
        : lotteryTypesArray[0] || 'ไม่ระบุ';
      
      // Calculate total payout for this ticket
      const totalPayout = ticketData.items.reduce((sum: number, item: any) => {
        return sum + (winningsLookup[item.id] || 0);
      }, 0);
      
      return {
        bill_number: ticket.bill_number,
        draw_date: ticket.draw_date,
        user_name: profile?.name || profile?.full_name || 'ไม่ระบุ',
        sub_type_name: ticketData.subTypeName,
        country_origin: ticketData.countryOrigin,
        lottery_type_detail: lotteryTypeDescription,
        total_amount: Number(ticket.total_amount || 0),
        total_payout: totalPayout,
        net_profit_loss: Number(ticket.total_amount || 0) - totalPayout,
        numbers_count: ticketData.totalNumbers,
        items_count: ticketData.items.length,
        status: ticket.status
      };
    }).filter((b: any) => b.status === 'confirmed');
    
    console.log('Enhanced bill summary data:', transformedData);
    return transformedData;
  } catch (err) {
    console.error('Error in enhanced fetchBillSummary:', err);
    throw err;
  }
};

// 3. แก้ไข renderBillsTab function
const renderBillsTab = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          สรุปตามบิล
          {(selectedDate || selectedLotteryType) && (
            <span className="text-sm font-normal text-muted-foreground">
              - {selectedDate && formatDate(selectedDate)}
              {selectedLotteryType && ` (ID: ${selectedLotteryType})`}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่บิล</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>ผู้ซื้อ</TableHead>
                <TableHead>ประเภทหวย</TableHead>
                <TableHead>รายละเอียดประเภท</TableHead>
                <TableHead className="text-right">จำนวน Items</TableHead>
                <TableHead className="text-right">จำนวนเลข</TableHead>
                <TableHead className="text-right">ยอดซื้อ</TableHead>
                <TableHead className="text-right">ยอดจ่าย</TableHead>
                <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {billSummary.map((item, index) => (
                  <motion.tr 
                    key={item.bill_number}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedBillNumber(item.bill_number);
                      setActiveTab('numbers');
                    }}
                  >
                    <TableCell className="font-medium">{item.bill_number}</TableCell>
                    <TableCell>{formatDate(item.draw_date)}</TableCell>
                    <TableCell>{item.user_name || 'ไม่ระบุ'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.sub_type_name}</span>
                        <span className="text-xs text-muted-foreground">({item.country_origin})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <span className="text-sm font-medium text-blue-600">
                          {item.lottery_type_detail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.items_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.numbers_count.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_amount))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(item.net_profit_loss))}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

// 4. เพิ่ม function สำหรับดึงรายละเอียดบิล
const fetchBillDetails = async (supabase: any, billNumber: string) => {
  try {
    const { data, error } = await supabase.rpc('get_bill_details_with_types', { p_bill_number: billNumber });
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('Error fetching bill details:', err);
    return [];
  }
};

// 5. เพิ่ม component สำหรับแสดงรายละเอียดบิล
const BillDetailModal = ({ billNumber, isOpen, onClose }: { billNumber: string; isOpen: boolean; onClose: () => void }) => {
  const [billDetails, setBillDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { supabase } = useAuth();

  useEffect(() => {
    if (isOpen && billNumber && supabase) {
      setLoading(true);
      fetchBillDetails(supabase, billNumber)
        .then(setBillDetails)
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
                    <TableCell>{detail.lottery_type}</TableCell>
                    <TableCell className="font-mono">{detail.numbers.join(', ')}</TableCell>
                    <TableCell className="text-right">{detail.numbers_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(detail.amount)}</TableCell>
                    <TableCell className="text-right">{detail.price_paid}x</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

// 6. ตัวอย่างการใช้งาน Modal
const [selectedBillForDetail, setSelectedBillForDetail] = useState<string>('');
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

// เพิ่ม event handler สำหรับดูรายละเอียด
const handleViewBillDetail = (billNumber: string) => {
  setSelectedBillForDetail(billNumber);
  setIsDetailModalOpen(true);
};

// 7. เพิ่ม column สำหรับปุ่มดูรายละเอียด (ใน renderBillsTab)
<TableCell>
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleViewBillDetail(item.bill_number);
    }}
    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
  >
    ดูรายละเอียด
  </button>
</TableCell>

// 8. เพิ่ม Modal ใน JSX return
<BillDetailModal 
  billNumber={selectedBillForDetail}
  isOpen={isDetailModalOpen}
  onClose={() => setIsDetailModalOpen(false)}
/>

export {
  fetchBillSummary,
  renderBillsTab,
  BillDetailModal,
  fetchBillDetails
};