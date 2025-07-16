// Fix Frontend Filters
// แก้ไขปัญหาการ filter ข้อมูลใน frontend

// 1. แก้ไข fetchBillSummary function
const fetchBillSummary = async (supabase, drawDate, lotteryTypeId) => {
  try {
    console.log('Fetching bill summary with params:', { drawDate, lotteryTypeId });
    
    // Try RPC function first
    const params = {};
    if (drawDate) params.p_draw_date = drawDate;
    if (lotteryTypeId) params.p_lottery_type_id = lotteryTypeId;
    
    const { data, error } = await supabase.rpc('get_bill_summary', params);
    
    if (!error && data) {
      // Always filter confirmed status
      const filtered = data.filter(b => b.status === 'confirmed');
      console.log('Received bill summary data:', filtered);
      return filtered;
    }
    
    // Fallback to direct SQL query with proper filtering
    console.log('RPC function failed, using direct query fallback');
    
    // Get tickets with proper filtering
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, total_amount, status, user_id')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) {
      console.error('Error in get_bill_summary fallback query:', ticketError);
      throw ticketError;
    }
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Apply lottery type filter if specified
    let filteredTickets = tickets;
    if (lotteryTypeId) {
      const ticketIds = tickets.map(t => t.id);
      const { data: filteredItems, error: itemError } = await supabase
        .from('lottery_ticket_items')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('lottery_sub_type_id', lotteryTypeId);
      
      if (itemError) throw itemError;
      
      const filteredTicketIds = filteredItems?.map(item => item.ticket_id) || [];
      filteredTickets = tickets.filter(t => filteredTicketIds.includes(t.id));
    }
    
    // Get user profiles
    const userIds = [...new Set(filteredTickets.map(t => t.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, full_name')
      .in('id', userIds);
    
    if (profileError) throw profileError;
    
    // Get ticket items for remaining tickets
    const remainingTicketIds = filteredTickets.map(t => t.id);
    const { data: ticketItems, error: itemsError } = await supabase
      .from('lottery_ticket_items')
      .select(`
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        )
      `)
      .in('ticket_id', remainingTicketIds);
    
    if (itemsError) throw itemsError;
    
    // Group items by ticket_id
    const itemsByTicket = (ticketItems || []).reduce((acc, item) => {
      if (!acc[item.ticket_id]) {
        acc[item.ticket_id] = [];
      }
      acc[item.ticket_id].push(item);
      return acc;
    }, {});
    
    // Transform data to match expected format
    const transformedData = filteredTickets.map(ticket => {
      const ticketItems = itemsByTicket[ticket.id] || [];
      const profile = profiles?.find(p => p.id === ticket.user_id);
      const firstItem = ticketItems[0];
      
      return {
        bill_number: ticket.bill_number,
        draw_date: ticket.draw_date,
        user_name: profile?.name || profile?.full_name || 'ไม่ระบุ',
        sub_type_name: firstItem?.lottery_sub_types?.sub_type_name || 'ไม่ระบุ',
        country_origin: firstItem?.lottery_sub_types?.country_origin || 'ไม่ระบุ',
        total_amount: Number(ticket.total_amount || 0),
        total_payout: 0, // Will be calculated separately
        net_profit_loss: Number(ticket.total_amount || 0), // Will be calculated separately
        numbers_count: ticketItems.length,
        status: ticket.status
      };
    });
    
    console.log('Transformed bill summary data:', transformedData);
    return transformedData;
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};

// 2. แก้ไข fetchLotteryTypeSummary function
const fetchLotteryTypeSummary = async (supabase, drawDate) => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_lottery_type_summary', { p_draw_date: drawDate });
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get tickets with proper filtering
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get ticket items with lottery types
    const ticketIds = tickets.map(t => t.id);
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select(`
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Group by lottery_sub_type_id
    const groupedData = {};
    
    (ticketItems || []).forEach(item => {
      const subTypeId = item.lottery_sub_type_id;
      const subType = item.lottery_sub_types;
      
      if (!groupedData[subTypeId]) {
        groupedData[subTypeId] = {
          lottery_sub_type_id: subTypeId,
          sub_type_name: subType.sub_type_name,
          country_origin: subType.country_origin,
          ticket_ids: new Set(),
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
          net_profit_loss: 0
        };
      }
      
      groupedData[subTypeId].ticket_ids.add(item.ticket_id);
      groupedData[subTypeId].total_numbers += 1;
    });
    
    // Calculate totals for each group
    Object.values(groupedData).forEach(group => {
      group.total_bills = group.ticket_ids.size;
      
      // Calculate total amount for this group
      group.ticket_ids.forEach(ticketId => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          group.total_purchase_amount += Number(ticket.total_amount || 0);
          group.net_profit_loss += Number(ticket.total_amount || 0);
        }
      });
      
      // Remove ticket_ids from final result
      delete group.ticket_ids;
    });
    
    return Object.values(groupedData).sort((a, b) => 
      Number(b.total_purchase_amount) - Number(a.total_purchase_amount)
    );
  } catch (err) {
    console.error('Error in fetchLotteryTypeSummary:', err);
    throw err;
  }
};

// 3. แก้ไข fetchDailySummary function
const fetchDailySummary = async (supabase) => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_daily_lottery_summary');
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get all confirmed tickets
    const { data: tickets, error: ticketError } = await supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount')
      .eq('status', 'confirmed');
    
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get ticket items count
    const ticketIds = tickets.map(t => t.id);
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select('ticket_id')
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Group by draw_date
    const groupedData = {};
    
    tickets.forEach(ticket => {
      const date = ticket.draw_date;
      if (!groupedData[date]) {
        groupedData[date] = {
          draw_date: date,
          total_bills: 0,
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
          net_profit_loss: 0,
          ticket_ids: new Set()
        };
      }
      
      groupedData[date].ticket_ids.add(ticket.id);
      groupedData[date].total_purchase_amount += Number(ticket.total_amount || 0);
      groupedData[date].net_profit_loss += Number(ticket.total_amount || 0);
    });
    
    // Count numbers for each date
    (ticketItems || []).forEach(item => {
      const ticket = tickets.find(t => t.id === item.ticket_id);
      if (ticket) {
        const date = ticket.draw_date;
        if (groupedData[date]) {
          groupedData[date].total_numbers += 1;
        }
      }
    });
    
    // Calculate final totals
    Object.values(groupedData).forEach(group => {
      group.total_bills = group.ticket_ids.size;
      delete group.ticket_ids;
    });
    
    return Object.values(groupedData).sort((a, b) =>
      new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime()
    );
  } catch (err) {
    console.error('Error in fetchDailySummary:', err);
    throw err;
  }
};

// 4. แก้ไข fetchNumberDetails function
const fetchNumberDetails = async (supabase, billNumber) => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_number_details', { p_bill_number: billNumber });
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get tickets
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number')
      .eq('status', 'confirmed');
    
    if (billNumber) {
      ticketQuery = ticketQuery.eq('bill_number', billNumber);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get ticket items with details
    const ticketIds = tickets.map(t => t.id);
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select(`
        id,
        ticket_id,
        numbers,
        amount,
        lottery_sub_number_id,
        lottery_sub_number!inner(
          id,
          digit_number,
          type_number,
          price_paid
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Transform data
    const transformedData = [];
    (ticketItems || []).forEach(item => {
      const ticket = tickets.find(t => t.id === item.ticket_id);
      if (ticket) {
        transformedData.push({
          id: item.id,
          bill_number: ticket.bill_number,
          lottery_type_name: `${item.lottery_sub_number.digit_number} ตัว${item.lottery_sub_number.type_number}`,
          digit_number: item.lottery_sub_number.digit_number,
          type_number: item.lottery_sub_number.type_number,
          numbers: item.numbers,
          amount: Number(item.amount || 0),
          price_paid: Number(item.lottery_sub_number.price_paid || 0),
          is_winning: false, // Will be calculated separately
          payout_amount: 0, // Will be calculated separately
          winning_numbers: undefined // Will be calculated separately
        });
      }
    });
    
    return transformedData;
  } catch (err) {
    console.error('Error in fetchNumberDetails:', err);
    throw err;
  }
};

// 5. Helper function สำหรับการ debounce
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 6. แก้ไข loadData function ใน React component
const createLoadDataFunction = (supabase, setStates) => {
  return async (selectedDate, selectedLotteryType, selectedBillNumber) => {
    const { 
      setIsLoading, 
      setError, 
      setDailySummary, 
      setLotteryTypeSummary, 
      setBillSummary, 
      setNumberDetails 
    } = setStates;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use Promise.all for parallel execution
      const [dailyData, typeData, billData, numberData] = await Promise.all([
        fetchDailySummary(supabase),
        fetchLotteryTypeSummary(supabase, selectedDate || undefined),
        fetchBillSummary(supabase, selectedDate || undefined, selectedLotteryType || undefined),
        fetchNumberDetails(supabase, selectedBillNumber || undefined)
      ]);
      
      setDailySummary(dailyData);
      setLotteryTypeSummary(typeData);
      setBillSummary(billData);
      setNumberDetails(numberData);
    } catch (err) {
      console.error('Data loading error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };
};

// Export functions for use in React component
export {
  fetchBillSummary,
  fetchLotteryTypeSummary,
  fetchDailySummary,
  fetchNumberDetails,
  debounce,
  createLoadDataFunction
};