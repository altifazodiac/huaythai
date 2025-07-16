# 🔧 แก้ไขปัญหาการดึงข้อมูลใน "สรุปตามบิล"

## 🎯 ปัญหาที่พบ

### 1. **ประเภทหวยไม่แสดงถูกต้อง**
- **ปัญหา**: แสดงเฉพาะ `sub_type_name` (เช่น "หวยลาว") แทนที่จะเป็นประเภทหวยที่ละเอียด
- **ควรแสดง**: "3 ตัวตรง", "2 ตัวล่าง", "วิ่งบน", "โต๊ด" ฯลฯ
- **สาเหตุ**: ไม่ได้ JOIN กับ `lottery_sub_number` table

### 2. **จำนวนเลขไม่ถูกต้อง**
- **ปัญหา**: ใช้ `ticketItems.length` แทนที่จะนับจำนวนเลขที่แท้จริง
- **ควรแสดง**: จำนวนเลขรวมทั้งหมดในบิล (เช่น ถ้ามี 3 items แต่ละ item มี 2 เลข = 6 เลข)
- **สาเหตุ**: ไม่ได้นับจำนวนเลขใน `numbers` array

## 🛠️ วิธีแก้ไข

### 1. แก้ไข `fetchBillSummary` function

```typescript
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
      console.log('Received bill summary data:', filtered);
      return filtered;
    }
    
    // Fallback to direct SQL query with detailed data
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
    
    // Get ticket items with detailed information
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
          lotteryTypes: new Set()
        };
      }
      
      // Count actual numbers in this item
      const numbersCount = item.numbers ? item.numbers.length : 0;
      acc[item.ticket_id].totalNumbers += numbersCount;
      
      // Add lottery type info
      const lotteryType = `${item.lottery_sub_number.digit_number} ตัว${item.lottery_sub_number.type_number}`;
      acc[item.ticket_id].lotteryTypes.add(lotteryType);
      
      acc[item.ticket_id].items.push({
        ...item,
        lotteryType: lotteryType,
        numbersCount: numbersCount
      });
      
      return acc;
    }, {});
    
    // Transform data to match expected format
    const transformedData = tickets.map((ticket: any) => {
      const ticketData = itemsByTicket[ticket.id] || { items: [], totalNumbers: 0, lotteryTypes: new Set() };
      const profile = profiles?.find((p: any) => p.id === ticket.user_id);
      const firstItem = ticketData.items[0];
      
      // Create detailed lottery type description
      const lotteryTypesArray = Array.from(ticketData.lotteryTypes);
      const lotteryTypeDescription = lotteryTypesArray.length > 1 
        ? `${lotteryTypesArray.join(', ')} (${lotteryTypesArray.length} ประเภท)`
        : lotteryTypesArray[0] || 'ไม่ระบุ';
      
      return {
        bill_number: ticket.bill_number,
        draw_date: ticket.draw_date,
        user_name: profile?.name || profile?.full_name || 'ไม่ระบุ',
        sub_type_name: firstItem?.lottery_sub_types?.sub_type_name || 'ไม่ระบุ',
        country_origin: firstItem?.lottery_sub_types?.country_origin || 'ไม่ระบุ',
        lottery_type_detail: lotteryTypeDescription,
        total_amount: Number(ticket.total_amount || 0),
        total_payout: 0, // Will be calculated from winnings
        net_profit_loss: Number(ticket.total_amount || 0),
        numbers_count: ticketData.totalNumbers,
        items_count: ticketData.items.length,
        status: ticket.status
      };
    }).filter((b: any) => b.status === 'confirmed');
    
    console.log('Enhanced bill summary data:', transformedData);
    return transformedData;
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};
```

### 2. อัปเดต Interface `BillSummary`

```typescript
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
```

### 3. แก้ไข `renderBillsTab` function

```typescript
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
```

### 4. แก้ไข RPC function `get_bill_summary`

```sql
CREATE OR REPLACE FUNCTION public.get_bill_summary(p_draw_date DATE DEFAULT NULL, p_lottery_type_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    bill_number TEXT,
    draw_date DATE,
    user_name TEXT,
    sub_type_name TEXT,
    country_origin TEXT,
    lottery_type_detail TEXT,
    total_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC,
    numbers_count BIGINT,
    items_count BIGINT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH bill_details AS (
        SELECT 
            lt.bill_number,
            lt.draw_date,
            COALESCE(p.name, p.full_name, 'ไม่ระบุ') as user_name,
            lst.sub_type_name,
            lst.country_origin,
            lt.total_amount,
            lt.status,
            -- Calculate lottery type details
            STRING_AGG(DISTINCT CONCAT(lsn.digit_number, ' ตัว', lsn.type_number), ', ') as lottery_type_detail,
            -- Count actual numbers
            SUM(CASE WHEN lti.numbers IS NOT NULL THEN array_length(lti.numbers, 1) ELSE 0 END) as numbers_count,
            -- Count items
            COUNT(lti.id) as items_count
        FROM public.lottery_tickets lt
        LEFT JOIN public.profiles p ON lt.user_id = p.id
        LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
        LEFT JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
        LEFT JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        AND (p_lottery_type_id IS NULL OR lst.lottery_sub_type_id = p_lottery_type_id)
        GROUP BY lt.bill_number, lt.draw_date, p.name, p.full_name, lst.sub_type_name, lst.country_origin, lt.total_amount, lt.status
    ),
    bill_winnings AS (
        SELECT 
            lt.bill_number,
            COALESCE(SUM(lw.winning_amount), 0) as payout_amount
        FROM public.lottery_tickets lt
        LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
        LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        AND (p_lottery_type_id IS NULL OR EXISTS (
            SELECT 1 FROM public.lottery_sub_types lst 
            WHERE lst.lottery_sub_type_id = lti.lottery_sub_type_id 
            AND lst.lottery_sub_type_id = p_lottery_type_id
        ))
        GROUP BY lt.bill_number
    )
    SELECT 
        bd.bill_number,
        bd.draw_date,
        bd.user_name,
        bd.sub_type_name,
        bd.country_origin,
        bd.lottery_type_detail,
        bd.total_amount,
        COALESCE(bw.payout_amount, 0) as total_payout,
        (bd.total_amount - COALESCE(bw.payout_amount, 0)) as net_profit_loss,
        bd.numbers_count,
        bd.items_count,
        bd.status
    FROM bill_details bd
    LEFT JOIN bill_winnings bw ON bd.bill_number = bw.bill_number
    ORDER BY bd.draw_date DESC, bd.bill_number;
END;
$$;
```

## 📋 ขั้นตอนการแก้ไข

### 1. อัปเดต Database Function
```bash
# รัน SQL script ใหม่
psql -h your-host -U your-user -d your-db -f enhanced_bill_summary.sql
```

### 2. อัปเดต TypeScript Interface
```typescript
// เพิ่มฟิลด์ใหม่ใน interface
interface BillSummary {
  // ... existing fields
  lottery_type_detail: string;
  items_count: number;
}
```

### 3. อัปเดต Frontend Code
```bash
# แก้ไขไฟล์ app/(protected)/summary/page.tsx
# อัปเดต fetchBillSummary function
# อัปเดต renderBillsTab function
```

## 🎯 ผลลัพธ์ที่คาดหวัง

### Before (ปัจจุบัน):
- **ประเภทหวย**: "หวยลาว (LA)"
- **จำนวนเลข**: "3" (จำนวน items)

### After (หลังแก้ไข):
- **ประเภทหวย**: "หวยลาว (LA)"
- **รายละเอียดประเภท**: "3 ตัวตรง, 2 ตัวล่าง (2 ประเภท)"
- **จำนวน Items**: "3"
- **จำนวนเลข**: "15" (จำนวนเลขที่แท้จริง)

## 🔍 การทดสอบ

### 1. ทดสอบ RPC Function
```sql
SELECT * FROM get_bill_summary('2024-01-01', NULL) LIMIT 5;
```

### 2. ทดสอบ Frontend
1. เปิดหน้า Summary
2. ไปที่แท็บ "สรุปตามบิล"
3. ตรวจสอบคอลัมน์ "รายละเอียดประเภท"
4. ตรวจสอบคอลัมน์ "จำนวนเลข"
5. ตรวจสอบคอลัมน์ "จำนวน Items"

### 3. Test Cases
```javascript
// Test case 1: บิลที่มีหลายประเภทหวย
// Expected: "3 ตัวตรง, 2 ตัวล่าง (2 ประเภท)"

// Test case 2: บิลที่มีประเภทเดียว
// Expected: "3 ตัวตรง"

// Test case 3: บิลที่มีหลายเลขต่อ item
// Expected: numbers_count = จำนวนเลขรวม, items_count = จำนวน items
```

## 🎨 UI Improvements

### การปรับปรุง UI เพิ่มเติม:
1. **Color-coded badges** สำหรับประเภทหวยต่างๆ
2. **Tooltip** แสดงรายละเอียดเพิ่มเติม
3. **Expandable rows** สำหรับดูรายละเอียด items
4. **Filter by lottery type** ที่ละเอียดกว่า

### Example Enhanced UI:
```typescript
<TableCell>
  <div className="flex flex-wrap gap-1">
    {item.lottery_type_detail.split(', ').map((type, idx) => (
      <Badge key={idx} variant="secondary" className="text-xs">
        {type}
      </Badge>
    ))}
  </div>
</TableCell>
```