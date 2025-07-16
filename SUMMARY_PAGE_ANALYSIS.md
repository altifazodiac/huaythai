# วิเคราะห์ปัญหาหน้า Summary และ RLS

## 🔍 ปัญหาที่พบ

### 1. ปัญหายอดซื้อที่คูณไม่ถูกต้อง

**สาเหตุ**: ความไม่สอดคล้องในการคำนวณยอดซื้อระหว่าง functions

#### ใน `get_daily_lottery_summary()`:
```sql
-- ใช้ SUM(lti.amount) จาก lottery_ticket_items
COALESCE(SUM(lti.amount), 0) as total_purchase_amount
```

#### ใน `get_bill_summary()`:
```sql
-- ใช้ lt.total_amount จาก lottery_tickets
lt.total_amount
```

**ผลกระทบ**: ข้อมูลแสดงผลไม่ตรงกัน เพราะ:
- `SUM(lti.amount)` จะรวมยอดของแต่ละ item
- `lt.total_amount` เป็นยอดรวมของบิลทั้งหมด

### 2. ปัญหา RLS (Row Level Security)

**ปัญหาปัจจุบัน**:
- RLS เปิดใช้งานแล้ว แต่ policies จำกัดเฉพาะผู้ใช้ทั่วไป
- ผู้ใช้ admin อาจไม่สามารถเห็นข้อมูลของผู้อื่นได้

**RLS Policies ปัจจุบัน**:
```sql
-- ผู้ใช้เห็นเฉพาะตั๋วของตัวเอง
CREATE POLICY "Users can view their own tickets"
    ON public.lottery_tickets
    FOR SELECT
    USING (auth.uid() = user_id);
```

### 3. ปัญหา Filter ไม่ทำงานถูกต้อง

**ใน Frontend fallback query**:
```typescript
// ไม่ได้ใช้ filter ที่ถูกต้อง
const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
  // ไม่มีการ filter ตาม selectedLotteryType
})
```

### 4. ปัญหา Supabase MCP

**Configuration ปัจจุบัน**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c", "npx", "-y", "@supabase/mcp-server-supabase@latest",
        "--access-token", "sbp_15b6d79b385ac87820812b9bf613ecb4503cc359"
      ]
    }
  }
}
```

**ปัญหา**:
- Access token อาจหมดอายุ
- ยังไม่มีการใช้งาน MCP อย่างเต็มรูปแบบ

## 🛠️ แนวทางแก้ไข

### 1. แก้ไขปัญหายอดซื้อ

#### แก้ไข `get_daily_lottery_summary()`:
```sql
CREATE OR REPLACE FUNCTION public.get_daily_lottery_summary()
RETURNS TABLE (
    draw_date DATE,
    total_bills BIGINT,
    total_numbers BIGINT,
    total_purchase_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.draw_date,
        COUNT(DISTINCT lt.id) as total_bills,
        COUNT(lti.id) as total_numbers,
        -- ใช้ SUM(lt.total_amount) แทน SUM(lti.amount)
        COALESCE(SUM(DISTINCT lt.total_amount), 0) as total_purchase_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        COALESCE(SUM(DISTINCT lt.total_amount), 0) - COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as net_profit_loss
    FROM public.lottery_tickets lt
    LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    WHERE lt.status = 'confirmed'
    GROUP BY lt.draw_date
    ORDER BY lt.draw_date DESC;
END;
$$;
```

### 2. แก้ไข RLS สำหรับ Admin

#### สร้าง Admin Policies:
```sql
-- เพิ่ม policy สำหรับ admin
CREATE POLICY "Admins can view all tickets"
    ON public.lottery_tickets
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can view all ticket items"
    ON public.lottery_ticket_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lottery_tickets lt
            WHERE lt.id = lottery_ticket_items.ticket_id
            AND (
                lt.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
            )
        )
    );
```

### 3. แก้ไข Frontend Filter

#### ปรับปรุง fallback query:
```typescript
const fetchBillSummary = async (supabase: any, drawDate?: string, lotteryTypeId?: number): Promise<BillSummary[]> => {
  try {
    // RPC function call
    const params: any = {};
    if (drawDate) params.p_draw_date = drawDate;
    if (lotteryTypeId) params.p_lottery_type_id = lotteryTypeId;
    
    const { data, error } = await supabase.rpc('get_bill_summary', params);
    
    if (!error && data) {
      return data.filter((b: BillSummary) => b.status === 'confirmed');
    }
    
    // Fallback with proper filtering
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, total_amount, status, user_id')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    // Apply lottery type filter properly
    if (lotteryTypeId) {
      const ticketIds = tickets?.map(t => t.id) || [];
      const { data: filteredItems } = await supabase
        .from('lottery_ticket_items')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('lottery_sub_type_id', lotteryTypeId);
      
      const filteredTicketIds = filteredItems?.map(item => item.ticket_id) || [];
      return tickets?.filter(t => filteredTicketIds.includes(t.id)) || [];
    }
    
    return tickets || [];
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};
```

### 4. แก้ไข Supabase MCP

#### อัปเดต MCP Configuration:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-url",
        "https://your-project.supabase.co",
        "--access-token",
        "your-new-access-token"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## 📋 ขั้นตอนการแก้ไข

### Step 1: แก้ไข Database Functions
```bash
# เรียกใช้ SQL commands เพื่อแก้ไข functions
psql -h your-host -U your-user -d your-db -f fix_summary_functions.sql
```

### Step 2: อัปเดต RLS Policies
```bash
# เรียกใช้ SQL commands เพื่อเพิ่ม admin policies
psql -h your-host -U your-user -d your-db -f add_admin_policies.sql
```

### Step 3: แก้ไข Frontend Code
```bash
# แก้ไขไฟล์ app/(protected)/summary/page.tsx
```

### Step 4: อัปเดต MCP Configuration
```bash
# อัปเดตไฟล์ app/supabase-mcp/.cursor/mcp.json
```

## 🧪 การทดสอบ

### 1. ทดสอบ Functions
```sql
-- ทดสอบ get_daily_lottery_summary
SELECT * FROM get_daily_lottery_summary();

-- ทดสอบ get_bill_summary
SELECT * FROM get_bill_summary('2024-01-01', 1);
```

### 2. ทดสอบ RLS
```sql
-- ทดสอบด้วย user ธรรมดา
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM lottery_tickets;

-- ทดสอบด้วย admin
SET request.jwt.claim.sub = 'admin-uuid';
SELECT * FROM lottery_tickets;
```

### 3. ทดสอบ Frontend
```typescript
// ทดสอบการ filter
const data = await fetchBillSummary(supabase, '2024-01-01', 1);
console.log('Filtered data:', data);
```

## 📊 ผลลัพธ์ที่คาดหวัง

1. **ยอดซื้อแสดงผลถูกต้อง**: ไม่มีการคูณซ้ำ
2. **Filter ทำงานถูกต้อง**: แสดงเฉพาะข้อมูลที่กรองแล้ว
3. **RLS ทำงานถูกต้อง**: Admin เห็นข้อมูลทั้งหมด, User เห็นเฉพาะของตัวเอง
4. **MCP ทำงานถูกต้อง**: สามารถ query ข้อมูลผ่าน MCP ได้

## 🔐 หมายเหตุความปลอดภัย

1. **Service Role Key**: ใช้เฉพาะใน server-side เท่านั้น
2. **Access Token**: ตรวจสอบและอัปเดตเป็นระยะ
3. **RLS Policies**: ตรวจสอบสิทธิ์ให้ถูกต้อง
4. **Function Security**: ใช้ `SECURITY DEFINER` อย่างระมัดระวัง