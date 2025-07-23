import { supabase } from '@/lib/supabase/supabaseClient'
import { calculateWinningsForItem } from '@/lib/utils/lottery-utils'

export interface DashboardData {
  users: {
    total: number
    newThisMonth: number
    active: number
    growthRate: number
    dailyStats: Array<{
      date: string
      newUsers: number
      activeUsers: number
      retention: number
    }>
    topUsers: Array<{
      id: string
      name: string
      branch: string
      totalSpent: number
      ticketCount: number
      avgSpent: number
    }>
  }
  revenue: {
    total: number
    growth: number
    byDrawDate: Record<string, number>
    dailyRevenue: Array<{
      date: string
      revenue: number
      tickets: number
      payout: number
      originalPayout: number
      netProfit: number
      numberCapSavings: number
      avgTicketValue: number
      profitMargin: number
      payoutRate: number
    }>
    monthlyComparison: Array<{
      month: string
      revenue: number
      previousMonth: number
      growthRate: number
      netProfit: number
      profitMargin: number
    }>
    revenueByLotteryType: Array<{
      type: string
      revenue: number
      tickets: number
      payout: number
      netProfit: number
      profitMargin: number
    }>
  }
  tickets: {
    sold: number
    sales: number
    pending: number
    cancelled: number
    growthRate: number
    dailyStats: Array<{
      date: string
      sold: number
      pending: number
      cancelled: number
      revenue: number
      avgTicketValue: number
      conversionRate: number
    }>
    typeDistribution: Array<{
      type: string
      count: number
      revenue: number
      percentage: number
      avgTicketValue: number
      profitMargin: number
    }>
    statusDistribution: Array<{
      status: string
      count: number
      percentage: number
    }>
  }
  lotteryTypes: {
    total: number
    popular: Array<{
      name: string
      country: string
      count: number
      revenue: number
      payout: number
      netProfit: number
      profitMargin: number
      growthRate: number
      avgTicketValue: number
    }>
    performance: Array<{
      type: string
      avgSales: number
      totalSales: number
      winRate: number
      payoutRate: number
      profitMargin: number
    }>
    dailyPerformance: Array<{
      date: string
      typeBreakdown: Record<string, {
        revenue: number
        tickets: number
        payout: number
        netProfit: number
      }>
    }>
  }
  performance: {
    totalSales: number
    totalPayout: number
    totalOriginalPayout: number
    netProfit: number
    profitMargin: number
    payoutRate: number
    numberCapSavings: number
    numberCapSavingsPercentage: number
    numberCapAffectedTickets: number
    bestPerformingDay: string
    worstPerformingDay: string
    averageDailySales: number
    averageDailyProfit: number
    roi: number
    breakEvenPoint: number
    riskMetrics: {
      maxDailyLoss: number
      maxDailyProfit: number
      volatility: number
      sharpeRatio: number
    }
  }
  recentActivities: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    amount?: number
    user?: string
    status?: string
    metadata?: Record<string, any>
  }>
  credit: {
    totalTx: number
    totalAmount: number
    totalTopups: number
    totalWithdrawals: number
    averageTransaction: number
    dailyTransactions: Array<{
      date: string
      deposits: number
      withdrawals: number
      netFlow: number
      txCount: number
      avgTxAmount: number
    }>
    transactionTypes: Array<{
      type: string
      count: number
      amount: number
      percentage: number
    }>
  }
  winning: {
    total: number
    totalPrize: number
    averagePrize: number
    payoutRate: number
    largestWin: number
    winningTickets: number
    winRate: number
    recentWins: Array<{
      date: string
      amount: number
      type: string
      user: string
      bill_number: string
      numbers: string
      winningNumbers: string
    }>
    winningsByType: Array<{
      type: string
      count: number
      totalPrize: number
      avgPrize: number
      winRate: number
    }>
    dailyWinnings: Array<{
      date: string
      winCount: number
      totalPrize: number
      avgPrize: number
      winRate: number
    }>
  }
  commission: {
    total: number
    totalPaid: number
    totalPending: number
    averageCommission: number
    commissionRate: number
    topEarners: Array<{
      id: string
      name: string
      branch: string
      commissionRate: number
      totalSales: number
      totalCommission: number
      paidCommission: number
      pendingCommission: number
      ticketCount: number
      avgCommissionPerTicket: number
    }>
    dailyCommission: Array<{
      date: string
      totalSales: number
      totalCommission: number
      paidCommission: number
      pendingCommission: number
      commissionRate: number
      activeUsers: number
    }>
    commissionByBranch: Array<{
      branch: string
      totalSales: number
      totalCommission: number
      paidCommission: number
      pendingCommission: number
      userCount: number
      avgCommissionPerUser: number
    }>
    commissionTrends: Array<{
      date: string
      commission: number
      sales: number
      commissionRate: number
      growthRate: number
    }>
  }
  analytics: {
    trends: {
      userGrowth: Array<{
        date: string
        newUsers: number
        totalUsers: number
        growthRate: number
      }>
      revenueGrowth: Array<{
        date: string
        revenue: number
        cumulativeRevenue: number
        growthRate: number
      }>
      profitTrends: Array<{
        date: string
        profit: number
        profitMargin: number
        cumulativeProfit: number
      }>
    }
    forecasts: {
      nextWeekRevenue: number
      nextWeekProfit: number
      nextMonthRevenue: number
      nextMonthProfit: number
      confidence: number
    }
    segments: {
      userSegments: Array<{
        segment: string
        userCount: number
        totalSpent: number
        avgSpent: number
        retention: number
      }>
      lotteryTypeSegments: Array<{
        type: string
        revenue: number
        users: number
        frequency: number
        profitability: number
      }>
    }
  }
}

export async function fetchDashboardData(dateRange: string = 'week'): Promise<DashboardData> {
  try {
    const now = new Date()
    const daysBack = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)
    
    // 🔧 แก้ไข: สร้าง resultsMap เองเหมือนหน้า summary
    // ใช้วิธีการเดียวกับหน้า summary เพื่อให้ "ยอดจ่าย" ตรงกัน
    // ดึงข้อมูลบิลก่อนเพื่อใช้กรองผลหวย
    const { data: ticketsForResultsMap, error: ticketsError } = await supabase
      .from('lottery_tickets')
      .select('draw_date')
      .eq('status', 'confirmed')
      .order('draw_date', { ascending: false });
    
    if (ticketsError) {
      console.error('Error fetching tickets for resultsMap:', ticketsError);
    }
    
    // สร้าง unique dates จากบิลที่ confirmed
    const uniqueDates = [...new Set((ticketsForResultsMap || []).map(t => t.draw_date))];
    
    // ดึงผลหวยเฉพาะวันที่ที่มีบิล confirmed
    const { data: resultsData, error: resultsError } = await supabase
      .from('lottery_results')
      .select('*')
      .in('draw_date', uniqueDates)
      .order('draw_date', { ascending: false });
    
    if (resultsError) {
      console.error('Error fetching lottery results:', resultsError);
    }
    
    // สร้าง resultsMap เหมือนหน้า summary
    const resultsMap: Record<string, any> = (resultsData || []).reduce((acc, res) => {
      const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
      acc[key] = res;
      return acc;
    }, {});
    
    // Fetch all required data in parallel for better performance
    const [
      usersData,
      ticketsData,
      creditData,
      lotteryTypesData,
      winningsData,
      profilesData,
      recentActivitiesData,
      commissionData
    ] = await Promise.all([
      fetchUsersData(startDate, previousStartDate),
      fetchTicketsData(startDate, previousStartDate, resultsMap), // ส่ง resultsMap ไปด้วย
      fetchCreditData(startDate, previousStartDate),
      fetchLotteryTypesData(startDate, previousStartDate),
      fetchWinningsData(startDate, previousStartDate),
      fetchProfilesData(startDate, previousStartDate),
      fetchRecentActivitiesData(startDate),
      fetchCommissionData(startDate, previousStartDate)
    ])

    // Calculate comprehensive performance metrics
    const performance = calculatePerformanceMetrics(
      ticketsData.dailyStats,
      ticketsData.totalRevenue,
      ticketsData.totalPayout,
      ticketsData.totalOriginalPayout,
      daysBack,
      ticketsData.numberCapAffectedTickets || 0
    )

    // Calculate analytics and forecasts
    const analytics = calculateAnalytics(
      usersData.dailyStats,
      ticketsData.dailyStats,
      performance,
      daysBack
    )

    return {
      users: usersData,
      revenue: {
        total: ticketsData.totalRevenue,
        growth: ticketsData.revenueGrowth,
        byDrawDate: ticketsData.revenueByDate,
        dailyRevenue: ticketsData.dailyStats,
        monthlyComparison: ticketsData.monthlyComparison,
        revenueByLotteryType: ticketsData.revenueByType
      },
      tickets: {
        sold: ticketsData.totalSold,
        sales: ticketsData.totalRevenue,
        pending: ticketsData.totalPending,
        cancelled: ticketsData.totalCancelled,
        growthRate: ticketsData.growthRate,
        dailyStats: ticketsData.dailyTicketStats,
        typeDistribution: ticketsData.typeDistribution,
        statusDistribution: ticketsData.statusDistribution
      },
      lotteryTypes: lotteryTypesData,
      performance,
      recentActivities: recentActivitiesData,
      credit: creditData,
      winning: winningsData,
      commission: commissionData,
      analytics
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return getEmptyDashboardData()
  }
}

// ฟังก์ชันใหม่: ใช้ logic เหมือน summary/page.tsx ทุกประการ
export async function fetchDashboardSummary(startDate: Date, endDate: Date) {
  // 🔧 แก้ไข: สร้าง resultsMap เองเหมือนหน้า summary
  // ใช้วิธีการเดียวกับหน้า summary เพื่อให้ "ยอดจ่าย" ตรงกัน
  // ดึงข้อมูลบิลก่อนเพื่อใช้กรองผลหวย
  const { data: ticketsForResultsMap, error: ticketsError } = await supabase
    .from('lottery_tickets')
    .select('draw_date')
    .eq('status', 'confirmed')
    .order('draw_date', { ascending: false });
  
  if (ticketsError) {
    console.error('Error fetching tickets for resultsMap:', ticketsError);
  }
  
  // สร้าง unique dates จากบิลที่ confirmed
  const uniqueDates = [...new Set((ticketsForResultsMap || []).map(t => t.draw_date))];
  
  // ดึงผลหวยเฉพาะวันที่ที่มีบิล confirmed
  const { data: resultsData, error: resultsError } = await supabase
    .from('lottery_results')
    .select('*')
    .in('draw_date', uniqueDates)
    .order('draw_date', { ascending: false });
  
  if (resultsError) {
    console.error('Error fetching lottery results:', resultsError);
  }
  
  // สร้าง resultsMap เหมือนหน้า summary
  const resultsMap: Record<string, any> = (resultsData || []).reduce((acc, res) => {
    const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
    acc[key] = res;
    return acc;
  }, {});

  // ดึง ticket เฉพาะ status 'confirmed' และ draw_date อยู่ในช่วง
  const { data: tickets, error: ticketError } = await supabase
    .from('lottery_tickets')
    .select('id, draw_date, total_amount, user_id, lottery_ticket_items(*, lottery_sub_number(*))')
    .eq('status', 'confirmed')
    .gte('draw_date', startDate.toISOString())
    .lte('draw_date', endDate.toISOString())
  if (ticketError) throw ticketError
  if (!tickets || tickets.length === 0) return []

  // ดึงชื่อ user
  const userIds = [...new Set(tickets.map((t: any) => t.user_id).filter(Boolean))]
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name').in('id', userIds)
  if (profileError) throw profileError
  const profilesMap = new Map(profiles.map((p: {id: string, name: string}) => [p.id, p.name]))

  // Group by date (และ user ถ้าต้องการ)
  const groupedData = (tickets || []).reduce<Record<string, {
    draw_date: string;
    user_id: string;
    user_name: string;
    total_bills: number;
    total_numbers: number;
    total_purchase_amount: number;
    total_payout: number;
  }>>((acc, ticket) => {
    if (!ticket.user_id) return acc;
    
    const key = `${ticket.draw_date}__${ticket.user_id}`;
    
    if (!acc[key]) {
      acc[key] = {
        draw_date: ticket.draw_date,
        user_id: ticket.user_id,
        user_name: profilesMap.get(ticket.user_id) || 'ไม่ระบุ',
        total_bills: 0,
        total_numbers: 0,
        total_purchase_amount: 0,
        total_payout: 0,
      };
    }
    
    let ticketPayout = 0;
    const items = Array.isArray(ticket.lottery_ticket_items) ? ticket.lottery_ticket_items : [];
    
    items.forEach((item) => {
      const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
      ticketPayout += prize;
      const numbers = Array.isArray(item.numbers) ? item.numbers : [];
      acc[key].total_numbers += numbers.length;
    });
    
    acc[key].total_bills += 1;
    acc[key].total_purchase_amount += Number(ticket.total_amount) || 0;
    acc[key].total_payout += ticketPayout;
    
    return acc;
  }, {});

  // คืนข้อมูลแบบเดียวกับ summary
  return Object.values(groupedData).map((summary: any) => ({
    ...summary,
    net_profit_loss: summary.total_purchase_amount - summary.total_payout
  })).sort((a: any, b: any) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime())
}

// Helper function to fetch users data
async function fetchUsersData(startDate: Date, previousStartDate: Date) {
  const now = new Date()
  
  // Fetch total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Fetch new users this month
  const { data: newUsersMonth } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())

  // Fetch active users (users who made transactions in last 30 days)
  const { data: activeUsers } = await supabase
    .from('profiles')
    .select('id, created_at')
    .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Fetch previous period users for growth calculation
  const { count: previousPeriodUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previousStartDate.toISOString())
    .lt('created_at', startDate.toISOString())

  // Calculate daily user stats
  const dailyStats = []
  const daysBack = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const { data: dayNewUsers } = await supabase
      .from('profiles')
      .select('id')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
    
    // Calculate active users for this day (users who made transactions)
    const { data: dayActiveUsers } = await supabase
      .from('credit_transactions')
      .select('user_id')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
    
    const uniqueActiveUsers = new Set(dayActiveUsers?.map(u => u.user_id) || []).size
    
    dailyStats.push({
      date: dayStart.toISOString().split('T')[0],
      newUsers: dayNewUsers?.length || 0,
      activeUsers: uniqueActiveUsers,
      retention: uniqueActiveUsers > 0 ? (uniqueActiveUsers / (totalUsers || 1)) * 100 : 0
    })
  }

  // Fetch top users by sales
  const { data: userData } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      branch,
      lottery_tickets!inner(
        id,
        total_amount,
        created_at,
        status
      )
    `)
    .eq('lottery_tickets.status', 'confirmed')
    .gte('lottery_tickets.created_at', startDate.toISOString())

  const topUsers = (userData || []).reduce((acc: any, profile: any) => {
    const userId = profile.id
    if (!acc[userId]) {
      acc[userId] = { 
        id: userId,
        name: profile.name || profile.email || 'ไม่ระบุ',
        branch: profile.branch || 'ไม่ระบุ',
        totalSpent: 0,
        ticketCount: 0
      }
    }
    
    const totalSpent = (profile.lottery_tickets || [])
      .filter((ticket: any) => ticket.status === 'confirmed')
      .reduce((sum: number, ticket: any) => sum + globalThis.Number(ticket.total_amount), 0)
    
    const ticketCount = (profile.lottery_tickets || [])
      .filter((ticket: any) => ticket.status === 'confirmed').length
    
    acc[userId].totalSpent += totalSpent
    acc[userId].ticketCount += ticketCount
    return acc
  }, {})

  const topUsersArray = Object.values(topUsers).map((user: any) => ({
    ...user,
    avgSpent: user.ticketCount > 0 ? user.totalSpent / user.ticketCount : 0
  })).sort((a: any, b: any) => b.totalSpent - a.totalSpent).slice(0, 5)

  const userGrowthRate = previousPeriodUsers && previousPeriodUsers > 0 
    ? ((newUsersMonth?.length || 0) / previousPeriodUsers) * 100 
    : 0

  return {
    total: totalUsers || 0,
    newThisMonth: newUsersMonth?.length || 0,
    active: activeUsers?.length || 0,
    growthRate: userGrowthRate,
    dailyStats: dailyStats.reverse(),
    topUsers: topUsersArray
  }
}

// Helper function to fetch tickets data
async function fetchTicketsData(startDate: Date, previousStartDate: Date, resultsMap: Record<string, any>) {
  const now = new Date()
  
  // ดึงข้อมูลบิลพื้นฐานก่อน
  const { data: tickets, error: ticketsError } = await supabase
    .from('lottery_tickets')
    .select(`
      id,
      total_amount,
      created_at,
      draw_date,
      status,
      user_id,
      bill_number,
      lottery_ticket_items(
        id,
        ticket_id,
        lottery_sub_number_id,
        lottery_sub_type_id,
        numbers,
        amount,
        effective_prize_rate,
        created_at,
        lottery_sub_number(
          id,
          name,
          description,
          lottery_sub_type_id,
          length,
          digit_number,
          type_number,
          price_paid
        )
      )
    `)
    .gte('draw_date', previousStartDate.toISOString())
    .order('created_at', { ascending: false })

  if (ticketsError) {
    console.error('❌ Error fetching lottery tickets:', ticketsError)
  }

  if (!tickets || tickets.length === 0) {
    return {
      totalSold: 0,
      totalRevenue: 0,
      totalPending: 0,
      totalCancelled: 0,
      totalPayout: 0,
      totalOriginalPayout: 0,
      growthRate: 0,
      revenueGrowth: 0,
      revenueByDate: {},
      dailyStats: [],
      dailyTicketStats: [],
      typeDistribution: [],
      statusDistribution: [],
      monthlyComparison: [],
      revenueByType: [],
      numberCapAffectedTickets: 0
    }
  }

  // ดึงข้อมูล lottery_sub_types สำหรับ mapping
  const subTypeIds = [...new Set(
    tickets.flatMap(ticket => 
      ticket.lottery_ticket_items?.map(item => item.lottery_sub_type_id) || []
    ).filter(Boolean)
  )] || []
  
  let subTypesMap = new Map()
  
  if (subTypeIds.length > 0) {
    const { data: subTypesData, error: subTypesError } = await supabase
      .from('lottery_sub_types')
      .select(`
        lottery_sub_type_id,
        sub_type_name,
        country_origin,
        payout_rate,
        is_active
      `)
      .in('lottery_sub_type_id', subTypeIds)
    
    if (!subTypesError && subTypesData) {
      subTypesMap = new Map(subTypesData.map(sub => [sub.lottery_sub_type_id, sub]))
    }
  }

  // Filter tickets เฉพาะ status 'confirmed' และใช้ draw_date เหมือน summary
  const currentPeriodTickets = tickets.filter(t => 
    new Date(t.draw_date) >= startDate && t.status === 'confirmed'
  )
  
  const previousPeriodTickets = tickets.filter(t => 
    new Date(t.draw_date) >= previousStartDate && 
    new Date(t.draw_date) < startDate && t.status === 'confirmed'
  )

  // Calculate daily statistics
  const dailyStats = []
  const revenueByDate: Record<string, number> = {}
  const daysBack = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  
  let totalRevenue = 0
  let totalPayout = 0
  let totalOriginalPayout = 0
  let numberCapAffectedTickets = 0

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    
    // Filter tickets เฉพาะ status 'confirmed' และใช้ draw_date ในแต่ละวัน เหมือน summary
    const dayTickets = currentPeriodTickets.filter(t => 
      t.draw_date.startsWith(dateStr) && t.status === 'confirmed'
    )
    
    const dayRevenue = dayTickets.reduce((sum, ticket) => sum + globalThis.Number(ticket.total_amount), 0)
    const dayTicketCount = dayTickets.length
    
    // คำนวณยอดจ่ายจริง (payout) ด้วย calculateWinningsForItem เฉพาะบิลที่ status 'confirmed' เหมือน summary
    let dayActualPayout = 0
    let dayOriginalPayout = 0
    let dayNumberCapCount = 0
    
    dayTickets.forEach(ticket => {
      let ticketHasNumberCap = false; // เพิ่มตัวแปรเพื่อตรวจสอบว่าบิลนี้ใช้เลขอั้นหรือไม่
      
      ticket.lottery_ticket_items?.forEach((item: any) => {
        // ใช้ฟังก์ชันเดียวกับ summary: calculateWinningsForItem อิงผลรางวัลจริง
        const { prize } = calculateWinningsForItem(
          item, 
          ticket.draw_date, 
          resultsMap
        )
        dayActualPayout += prize

        // Calculate original payout (without number cap)
        const originalRate = item.lottery_sub_number?.price_paid || 0
        const { prize: originalPrize } = calculateWinningsForItem(
          { ...item, effective_prize_rate: originalRate }, 
          ticket.draw_date, 
          resultsMap
        )
        dayOriginalPayout += originalPrize

        // ตรวจสอบว่าบิลนี้ใช้เลขอั้นหรือไม่
        if (item.number_cap_action) {
          ticketHasNumberCap = true;
        }
      })
      
      // นับบิลที่ใช้เลขอั้นที่ระดับ ticket
      if (ticketHasNumberCap) {
        dayNumberCapCount++;
      }
    })
    
    revenueByDate[dateStr] = dayRevenue
    totalRevenue += dayRevenue
    totalPayout += dayActualPayout
    totalOriginalPayout += dayOriginalPayout
    numberCapAffectedTickets += dayNumberCapCount
    
    // กำไร/ขาดทุน = ยอดซื้อ - ยอดจ่ายจริง (ตามผลรางวัล) เหมือน summary
    const netProfit = dayRevenue - dayActualPayout
    const profitMargin = dayRevenue > 0 ? (netProfit / dayRevenue) * 100 : 0
    const payoutRate = dayRevenue > 0 ? (dayActualPayout / dayRevenue) * 100 : 0
    
    dailyStats.push({
      date: dateStr,
      revenue: dayRevenue,
      tickets: dayTicketCount,
      payout: dayActualPayout,
      originalPayout: dayOriginalPayout,
      netProfit,
      numberCapSavings: dayOriginalPayout - dayActualPayout,
      avgTicketValue: dayTicketCount > 0 ? dayRevenue / dayTicketCount : 0,
      profitMargin,
      payoutRate
    })
  }

  // Calculate ticket statistics
  const totalSold = currentPeriodTickets.filter(t => t.status === 'confirmed').length
  const totalPending = currentPeriodTickets.filter(t => t.status === 'pending').length
  const totalCancelled = currentPeriodTickets.filter(t => t.status === 'cancelled').length

  const previousRevenue = previousPeriodTickets.reduce((sum, t) => sum + globalThis.Number(t.total_amount), 0)
  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
  const growthRate = previousPeriodTickets.length > 0 ? ((totalSold - previousPeriodTickets.length) / previousPeriodTickets.length) * 100 : 0

  // Calculate type distribution
  const typeDistribution = calculateTypeDistribution(currentPeriodTickets)
  const statusDistribution = calculateStatusDistribution(currentPeriodTickets)
  const revenueByType = calculateRevenueByType(currentPeriodTickets, resultsMap)
  const monthlyComparison = calculateMonthlyComparison(tickets)

  return {
    totalSold,
    totalPending,
    totalCancelled,
    totalRevenue,
    totalPayout,
    totalOriginalPayout,
    revenueGrowth,
    growthRate,
    revenueByDate,
    dailyStats: dailyStats.reverse(),
    dailyTicketStats: dailyStats.map(d => ({
      date: d.date,
      sold: d.tickets,
      pending: 0, // Would need additional query
      cancelled: 0, // Would need additional query
      revenue: d.revenue,
      avgTicketValue: d.avgTicketValue,
      conversionRate: 100 // Placeholder
    })),
    typeDistribution,
    statusDistribution,
    monthlyComparison,
    revenueByType,
    numberCapAffectedTickets
  }
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(
  dailyStats: any[],
  totalSales: number,
  totalPayout: number,
  totalOriginalPayout: number,
  daysBack: number,
  numberCapAffectedTickets: number
) {
  const netProfit = totalSales - totalPayout
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0
  const payoutRate = totalSales > 0 ? (totalPayout / totalSales) * 100 : 0
  const numberCapSavings = totalOriginalPayout - totalPayout
  const numberCapSavingsPercentage = totalOriginalPayout > 0 ? (numberCapSavings / totalOriginalPayout) * 100 : 0
  
  const bestPerformingDay = dailyStats.length > 0 
    ? dailyStats.reduce((max, day) => day.netProfit > max.netProfit ? day : max, dailyStats[0])
    : null
  
  const worstPerformingDay = dailyStats.length > 0
    ? dailyStats.reduce((min, day) => day.netProfit < min.netProfit ? day : min, dailyStats[0])
    : null

  const averageDailySales = daysBack > 0 ? totalSales / daysBack : 0
  const averageDailyProfit = daysBack > 0 ? netProfit / daysBack : 0
  const roi = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

  // Calculate risk metrics
  const dailyProfits = dailyStats.map(d => d.netProfit)
  const maxDailyLoss = Math.min(...dailyProfits)
  const maxDailyProfit = Math.max(...dailyProfits)
  const avgDailyProfit = dailyProfits.reduce((sum, p) => sum + p, 0) / dailyProfits.length
  const variance = dailyProfits.reduce((sum, p) => sum + Math.pow(p - avgDailyProfit, 2), 0) / dailyProfits.length
  const volatility = Math.sqrt(variance)
  const sharpeRatio = volatility > 0 ? avgDailyProfit / volatility : 0

  return {
    totalSales,
    totalPayout,
    totalOriginalPayout,
    netProfit,
    profitMargin,
    payoutRate,
    numberCapSavings,
    numberCapSavingsPercentage,
    numberCapAffectedTickets,
    bestPerformingDay: bestPerformingDay?.date || '',
    worstPerformingDay: worstPerformingDay?.date || '',
    averageDailySales,
    averageDailyProfit,
    roi,
    breakEvenPoint: averageDailySales > 0 ? totalPayout / averageDailySales : 0,
    riskMetrics: {
      maxDailyLoss,
      maxDailyProfit,
      volatility,
      sharpeRatio
    }
  }
}

// Helper functions for additional calculations
function calculateTypeDistribution(tickets: any[]) {
  const typeMap: Record<string, any> = {}
  
  tickets.forEach(ticket => {
    ticket.lottery_ticket_items?.forEach((item: any) => {
      const typeName = item.lottery_sub_types?.sub_type_name || 'Unknown'
      if (!typeMap[typeName]) {
        typeMap[typeName] = {
          type: typeName,
          count: 0,
          revenue: 0
        }
      }
      typeMap[typeName].count += 1
      typeMap[typeName].revenue += globalThis.Number(item.amount)
    })
  })

  const totalRevenue = Object.values(typeMap).reduce((sum: number, type: any) => sum + type.revenue, 0)
  
  return Object.values(typeMap).map((type: any) => ({
    ...type,
    percentage: totalRevenue > 0 ? (type.revenue / totalRevenue) * 100 : 0,
    avgTicketValue: type.count > 0 ? type.revenue / type.count : 0,
    profitMargin: 0 // Would need payout calculation
  }))
}

function calculateStatusDistribution(tickets: any[]) {
  const statusMap: Record<string, number> = {}
  
  tickets.forEach(ticket => {
    const status = ticket.status || 'unknown'
    statusMap[status] = (statusMap[status] || 0) + 1
  })

  const total = tickets.length
  
  return Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }))
}

function calculateRevenueByType(tickets: any[], resultsMap: Record<string, any>) {
  const typeMap: Record<string, any> = {}
  
  tickets.forEach(ticket => {
    ticket.lottery_ticket_items?.forEach((item: any) => {
      const typeName = item.lottery_sub_types?.sub_type_name || 'Unknown'
      if (!typeMap[typeName]) {
        typeMap[typeName] = {
          type: typeName,
          revenue: 0,
          tickets: 0,
          payout: 0
        }
      }
      
      typeMap[typeName].revenue += globalThis.Number(item.amount)
      typeMap[typeName].tickets += 1
      
      // Calculate payout
      const { prize } = calculateWinningsForItem(
        item, 
        ticket.draw_date, 
        resultsMap
      )
      typeMap[typeName].payout += prize
    })
  })

  return Object.values(typeMap).map((type: any) => ({
    ...type,
    netProfit: type.revenue - type.payout,
    profitMargin: type.revenue > 0 ? ((type.revenue - type.payout) / type.revenue) * 100 : 0
  }))
}

function calculateMonthlyComparison(tickets: any[]) {
  // Implementation for monthly comparison
  return []
}

// Helper function to fetch other data types
async function fetchCreditData(startDate: Date, previousStartDate: Date) {
  const { data: creditTx } = await supabase
    .from('credit_transactions')
    .select('*')
    .gte('created_at', previousStartDate.toISOString())
    .order('created_at', { ascending: false })

  const currentPeriodTx = creditTx?.filter(tx => new Date(tx.created_at) >= startDate) || []
  
  const totalTx = currentPeriodTx.length
  const totalAmount = currentPeriodTx.reduce((sum, tx) => sum + globalThis.Number(tx.amount), 0)
  const totalTopups = currentPeriodTx.filter(tx => tx.transaction_type === 'topup').reduce((sum, tx) => sum + globalThis.Number(tx.amount), 0)
  const totalWithdrawals = currentPeriodTx.filter(tx => tx.transaction_type === 'withdrawal').reduce((sum, tx) => sum + globalThis.Number(tx.amount), 0)

  // Calculate daily transactions
  const dailyTransactions: {
    date: string
    deposits: number
    withdrawals: number
    netFlow: number
    txCount: number
    avgTxAmount: number
  }[] = []

  // Calculate transaction types
  const transactionTypes: {
    type: string
    count: number
    amount: number
    percentage: number
  }[] = []

  return {
    totalTx,
    totalAmount,
    totalTopups,
    totalWithdrawals,
    averageTransaction: totalTx > 0 ? totalAmount / totalTx : 0,
    dailyTransactions,
    transactionTypes
  }
}

// Helper function to calculate winnings for a ticket item - ตรงกับ summary page
const calculateWinningsForItem = (
  item: any,
  ticketDrawDate: string,
  resultsMap: Record<string, any>
): { prize: number; isWinning: boolean; winningNumberDisplay?: string, matchedNumber?: string } => {
  if (!item.lottery_sub_number || !item.numbers) {
    return { prize: 0, isWinning: false };
  }

  const { digit_number, type_number, price_paid } = item.lottery_sub_number;

  let prizeCodePattern = '';
  if (type_number === 'โต๊ด') prizeCodePattern = `${digit_number} ตัวโต๊ด`;
  else if (type_number === 'บน') prizeCodePattern = `${digit_number} ตัวบน`;
  else if (type_number === 'ล่าง') prizeCodePattern = `${digit_number} ตัวล่าง`;
  else if (type_number === 'วิ่งบน') prizeCodePattern = 'วิ่งบน';
  else if (type_number === 'วิ่งล่าง') prizeCodePattern = 'วิ่งล่าง';

  const resultMapKey = `${ticketDrawDate}|${item.lottery_sub_type_id}|${prizeCodePattern}`;
  const matchingResult = resultsMap[resultMapKey];

  if (!matchingResult || !matchingResult.winning_number) {
    return { prize: 0, isWinning: false };
  }

  let matchedNumbers: string[] = [];
  
  if (type_number === 'โต๊ด') {
    const winningSet = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
    matchedNumbers = item.numbers.filter((num: string) => winningSet.has(num));
  } else if (type_number === 'วิ่งบน' || type_number === 'วิ่งล่าง') {
    const winningDigits = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
    item.numbers.forEach((num: string) => {
      for (const digit of num) {
        if (winningDigits.has(digit)) {
          matchedNumbers.push(num);
          break;
        }
      }
    });
  } else {
    matchedNumbers = item.numbers.filter((num: string) => num === matchingResult.winning_number);
  }

  if (matchedNumbers.length > 0) {
    const effectiveRate = item.effective_prize_rate ?? price_paid ?? 0;
    const prize = parseFloat(item.amount.toString()) * parseFloat(String(effectiveRate)) * matchedNumbers.length;
    return { 
      prize, 
      isWinning: true, 
      winningNumberDisplay: matchingResult.winning_number, 
      matchedNumber: matchedNumbers.join(', ')
    };
  }

  return { prize: 0, isWinning: false };
};

async function fetchLotteryTypesData(startDate: Date, previousStartDate: Date) {
  try {
    console.log('🔍 Fetching lottery types data...')
    
    // ดึงข้อมูล lottery_tickets ที่ confirmed ในช่วงเวลาที่กำหนด
    const { data: tickets, error: ticketsError } = await supabase
      .from('lottery_tickets')
      .select(`
        id,
        total_amount,
        created_at,
        draw_date,
        status,
        user_id,
        bill_number,
        lottery_ticket_items(
          id,
          ticket_id,
          lottery_sub_number_id,
          lottery_sub_type_id,
          numbers,
          amount,
          effective_prize_rate,
          created_at,
          lottery_sub_number(
            id,
            name,
            description,
            lottery_sub_type_id,
            length,
            digit_number,
            type_number,
            price_paid
          )
        )
      `)
      .gte('draw_date', previousStartDate.toISOString())
      .order('created_at', { ascending: false })
    
    if (ticketsError) {
      console.error('❌ Error fetching lottery tickets:', ticketsError)
    }

    if (!tickets || tickets.length === 0) {
      console.log('⚠️ No tickets found, returning empty data')
      return { total: 0, popular: [], performance: [], dailyPerformance: [] }
    }

    console.log('✅ Tickets data fetched:', tickets?.length || 0, 'records')

    // ดึงข้อมูล lottery_sub_types สำหรับ mapping
    const subTypeIds = [...new Set(
      tickets.flatMap(ticket => 
        ticket.lottery_ticket_items?.map(item => item.lottery_sub_type_id) || []
      ).filter(Boolean)
    )] || []
    
    let subTypesMap = new Map()
    
    if (subTypeIds.length > 0) {
      const { data: subTypesData, error: subTypesError } = await supabase
        .from('lottery_sub_types')
        .select(`
          lottery_sub_type_id,
          sub_type_name,
          country_origin,
          payout_rate,
          is_active
        `)
        .in('lottery_sub_type_id', subTypeIds)
      
      if (!subTypesError && subTypesData) {
        subTypesMap = new Map(subTypesData.map(sub => [sub.lottery_sub_type_id, sub]))
      }
    }

    // ดึงข้อมูล lottery_results สำหรับคำนวณ payout
    const { data: resultsData, error: resultsError } = await supabase
      .from('lottery_results')
      .select(`
        lottery_sub_type_id,
        draw_date,
        prize_code,
        winning_number
      `)
      .gte('draw_date', startDate.toISOString())
      .lte('draw_date', new Date().toISOString())
    
    if (resultsError) {
      console.error('❌ Error fetching lottery results:', resultsError)
    }
    
    // สร้าง resultsMap สำหรับคำนวณ payout - ตรงกับ summary page
    const resultsMap: Record<string, any> = {}
    resultsData?.forEach(result => {
      const key = `${result.draw_date}|${result.lottery_sub_type_id}|${result.prize_code}`
      resultsMap[key] = result
    })
    
    console.log('✅ Results data fetched:', resultsData?.length || 0, 'records')
    
    // ประมวลผลข้อมูล
    const typeStats = new Map()
    tickets?.forEach(ticket => {
      ticket.lottery_ticket_items?.forEach((item: any) => {
        const subType = subTypesMap.get(item.lottery_sub_type_id)
        if (subType) {
          const typeName = subType.sub_type_name || 'ไม่ระบุ'
          const current = typeStats.get(typeName) || { 
            sales: 0, 
            items: 0, 
            tickets: 0,
            revenue: 0,
            payout: 0,
            netProfit: 0
          }
          current.sales += item.amount || 0
          current.items += 1
          current.revenue += item.amount || 0
          
          // คำนวณ payout
          const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap)
          current.payout += prize
          
          typeStats.set(typeName, current)
        }
      })
    })
    
    // นับจำนวน tickets ที่ไม่ซ้ำกัน
    const ticketTypeCount = new Map<string, Set<number>>()
    tickets?.forEach(ticket => {
      ticket.lottery_ticket_items?.forEach(item => {
        const subType = subTypesMap.get(item.lottery_sub_type_id)
        if (subType) {
          const typeName = subType.sub_type_name || 'ไม่ระบุ'
          if (!ticketTypeCount.has(typeName)) {
            ticketTypeCount.set(typeName, new Set())
          }
          ticketTypeCount.get(typeName)!.add(item.ticket_id)
        }
      })
    })
    
    // อัปเดตจำนวน tickets
    ticketTypeCount.forEach((ticketSet, typeName) => {
      const stats = typeStats.get(typeName)
      if (stats) {
        stats.tickets = ticketSet.size
      }
    })
    
    // แปลงเป็น array format สำหรับ popular
    const popular = Array.from(typeStats.entries()).map(([name, stats]) => {
      // หา subType ที่ตรงกับ name
      const subType = Array.from(subTypesMap.values()).find(st => st.sub_type_name === name)
      return {
        name,
        country: subType?.country_origin || 'Thailand',
        count: stats.tickets,
        revenue: stats.revenue,
        payout: stats.payout,
        netProfit: stats.revenue - stats.payout, // คำนวณกำไรสุทธิ
        profitMargin: stats.revenue > 0 ? ((stats.revenue - stats.payout) / stats.revenue) * 100 : 0,
        growthRate: 0, // ข้อมูลจำลอง
        avgTicketValue: stats.tickets > 0 ? stats.revenue / stats.tickets : 0
      }
    })
    
    // แปลงเป็น array format สำหรับ performance
    const performance = Array.from(typeStats.entries()).map(([name, stats]) => ({
      type: name,
      avgSales: stats.items > 0 ? stats.sales / stats.items : 0,
      totalSales: stats.sales,
      winRate: 0, // ข้อมูลจำลอง
      payoutRate: stats.revenue > 0 ? (stats.payout / stats.revenue) * 100 : 0,
      profitMargin: stats.revenue > 0 ? ((stats.revenue - stats.payout) / stats.revenue) * 100 : 0
    }))
    
    // สร้าง dailyPerformance (ข้อมูลจำลอง)
    const dailyPerformance = []
    
    console.log('✅ Processed lottery types data:', {
      types: popular.length,
      total: popular.length,
      popular,
      performance
    })
    
    return {
      total: popular.length,
      popular,
      performance,
      dailyPerformance
    }
    
  } catch (error) {
    console.error('❌ Error in fetchLotteryTypesData:', error)
    return { total: 0, popular: [], performance: [], dailyPerformance: [] }
  }
}

async function fetchWinningsData(startDate: Date, previousStartDate: Date) {
  // Implementation for winnings data
  return {
    total: 0,
    totalPrize: 0,
    averagePrize: 0,
    payoutRate: 0,
    largestWin: 0,
    winningTickets: 0,
    winRate: 0,
    recentWins: [],
    winningsByType: [],
    dailyWinnings: []
  }
}

async function fetchProfilesData(startDate: Date, previousStartDate: Date) {
  // Implementation for profiles data
  return {}
}

async function fetchRecentActivitiesData(startDate: Date) {
  try {
    const { data: activities } = await supabase
    .from('lottery_tickets')
    .select(`
      id,
      created_at,
        total_amount,
      status,
      bill_number,
        profiles!inner(name)
    `)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

    return (activities || []).map((activity: any) => ({
    id: activity.id,
    type: 'ticket_purchase',
      description: `ซื้อหวย ${activity.bill_number}`,
    timestamp: activity.created_at,
      amount: activity.total_amount,
      user: activity.profiles?.name,
    status: activity.status,
    metadata: {
      billNumber: activity.bill_number
    }
  }))
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}

async function fetchCommissionData(startDate: Date, previousStartDate: Date) {
  try {
    // ดึงข้อมูลบิลและค่าคอมมิชชั่น
    const { data: tickets } = await supabase
      .from('lottery_tickets')
      .select(`
        id,
        total_amount,
        created_at,
        draw_date,
        status,
        user_id,
        profiles!inner(
          id,
          name,
          branch,
          percent
        )
      `)
      .gte('draw_date', previousStartDate.toISOString())
      .eq('status', 'confirmed')
      .order('draw_date', { ascending: false })

    if (!tickets || tickets.length === 0) {
      return {
        total: 0,
        totalPaid: 0,
        totalPending: 0,
        averageCommission: 0,
        commissionRate: 0,
        topEarners: [],
        dailyCommission: [],
        commissionByBranch: [],
        commissionTrends: []
      }
    }

    // คำนวณค่าคอมมิชชั่นสำหรับแต่ละบิล
    const commissionData = tickets.map((ticket: any) => {
      const commissionRate = ticket.profiles?.percent || 0
      const commission = (ticket.total_amount * commissionRate) / 100
      return {
        ...ticket,
        commission,
        commissionRate
      }
    })

    // แยกข้อมูลช่วงเวลาปัจจุบันและก่อนหน้า
    const currentPeriodData = commissionData.filter(t => 
      new Date(t.draw_date) >= startDate
    )
    const previousPeriodData = commissionData.filter(t => 
      new Date(t.draw_date) >= previousStartDate && 
      new Date(t.draw_date) < startDate
    )

    // คำนวณสถิติรวม
    const totalSales = currentPeriodData.reduce((sum, t) => sum + t.total_amount, 0)
    const totalCommission = currentPeriodData.reduce((sum, t) => sum + t.commission, 0)
    const totalPaid = totalCommission * 0.8 // สมมติว่าจ่าย 80%
    const totalPending = totalCommission - totalPaid
    const averageCommission = currentPeriodData.length > 0 ? totalCommission / currentPeriodData.length : 0
    const commissionRate = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0

    // คำนวณ Top Earners
    const userCommissionMap = new Map()
    currentPeriodData.forEach(ticket => {
      const userId = ticket.user_id
      if (!userCommissionMap.has(userId)) {
        userCommissionMap.set(userId, {
          id: userId,
          name: ticket.profiles?.name || 'ไม่ระบุ',
          branch: ticket.profiles?.branch || 'ไม่ระบุ',
          commissionRate: ticket.commissionRate,
          totalSales: 0,
          totalCommission: 0,
          paidCommission: 0,
          pendingCommission: 0,
          ticketCount: 0,
          avgCommissionPerTicket: 0
        })
      }
      
      const userData = userCommissionMap.get(userId)
      userData.totalSales += ticket.total_amount
      userData.totalCommission += ticket.commission
      userData.ticketCount += 1
    })

    // คำนวณค่าคอมมิชชั่นที่จ่ายและค้างจ่าย
    userCommissionMap.forEach(userData => {
      userData.paidCommission = userData.totalCommission * 0.8
      userData.pendingCommission = userData.totalCommission - userData.paidCommission
      userData.avgCommissionPerTicket = userData.ticketCount > 0 ? userData.totalCommission / userData.ticketCount : 0
    })

    const topEarners = Array.from(userCommissionMap.values())
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 10)

    // คำนวณค่าคอมมิชชั่นรายวัน
    const dailyCommissionMap = new Map()
    const daysBack = Math.ceil((new Date().getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(new Date().getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayData = currentPeriodData.filter(t => t.draw_date.startsWith(dateStr))
      const daySales = dayData.reduce((sum, t) => sum + t.total_amount, 0)
      const dayCommission = dayData.reduce((sum, t) => sum + t.commission, 0)
      const dayPaidCommission = dayCommission * 0.8
      const dayPendingCommission = dayCommission - dayPaidCommission
      const dayCommissionRate = daySales > 0 ? (dayCommission / daySales) * 100 : 0
      const activeUsers = new Set(dayData.map(t => t.user_id)).size

      dailyCommissionMap.set(dateStr, {
        date: dateStr,
        totalSales: daySales,
        totalCommission: dayCommission,
        paidCommission: dayPaidCommission,
        pendingCommission: dayPendingCommission,
        commissionRate: dayCommissionRate,
        activeUsers
      })
    }

    const dailyCommission = Array.from(dailyCommissionMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // คำนวณค่าคอมมิชชั่นตามสาขา
    const branchCommissionMap = new Map()
    currentPeriodData.forEach(ticket => {
      const branch = ticket.profiles?.branch || 'ไม่ระบุ'
      if (!branchCommissionMap.has(branch)) {
        branchCommissionMap.set(branch, {
          branch,
          totalSales: 0,
          totalCommission: 0,
          paidCommission: 0,
          pendingCommission: 0,
          userCount: new Set(),
          avgCommissionPerUser: 0
        })
      }
      
      const branchData = branchCommissionMap.get(branch)
      branchData.totalSales += ticket.total_amount
      branchData.totalCommission += ticket.commission
      branchData.userCount.add(ticket.user_id)
    })

    branchCommissionMap.forEach(branchData => {
      branchData.paidCommission = branchData.totalCommission * 0.8
      branchData.pendingCommission = branchData.totalCommission - branchData.paidCommission
      branchData.userCount = branchData.userCount.size
      branchData.avgCommissionPerUser = branchData.userCount > 0 ? branchData.totalCommission / branchData.userCount : 0
    })

    const commissionByBranch = Array.from(branchCommissionMap.values())
      .sort((a, b) => b.totalCommission - a.totalCommission)

    // คำนวณแนวโน้มค่าคอมมิชชั่น
    const commissionTrends = dailyCommission.map((day, index) => {
      const previousDay = dailyCommission[index + 1]
      const growthRate = previousDay && previousDay.totalCommission > 0 
        ? ((day.totalCommission - previousDay.totalCommission) / previousDay.totalCommission) * 100 
        : 0

      return {
        date: day.date,
        commission: day.totalCommission,
        sales: day.totalSales,
        commissionRate: day.commissionRate,
        growthRate
      }
    })

    return {
      total: totalCommission,
      totalPaid,
      totalPending,
      averageCommission,
      commissionRate,
      topEarners,
      dailyCommission,
      commissionByBranch,
      commissionTrends
    }
  } catch (error) {
    console.error('Error fetching commission data:', error)
    return {
      total: 0,
      totalPaid: 0,
      totalPending: 0,
      averageCommission: 0,
      commissionRate: 0,
      topEarners: [],
      dailyCommission: [],
      commissionByBranch: [],
      commissionTrends: []
    }
  }
}

function calculateAnalytics(userStats: any[], ticketStats: any[], performance: any, daysBack: number) {
  // Implementation for analytics calculations
  return {
    trends: {
      userGrowth: [],
      revenueGrowth: [],
      profitTrends: []
    },
    forecasts: {
      nextWeekRevenue: 0,
      nextWeekProfit: 0,
      nextMonthRevenue: 0,
      nextMonthProfit: 0,
      confidence: 0
    },
    segments: {
      userSegments: [],
      lotteryTypeSegments: []
    }
  }
}

function getEmptyDashboardData(): DashboardData {
  return {
    users: { total: 0, newThisMonth: 0, active: 0, growthRate: 0, dailyStats: [], topUsers: [] },
    revenue: { total: 0, growth: 0, byDrawDate: {}, dailyRevenue: [], monthlyComparison: [], revenueByLotteryType: [] },
    tickets: { sold: 0, sales: 0, pending: 0, cancelled: 0, growthRate: 0, dailyStats: [], typeDistribution: [], statusDistribution: [] },
    lotteryTypes: { total: 0, popular: [], performance: [], dailyPerformance: [] },
    performance: { 
      totalSales: 0, totalPayout: 0, totalOriginalPayout: 0, netProfit: 0, profitMargin: 0, payoutRate: 0,
      numberCapSavings: 0, numberCapSavingsPercentage: 0, numberCapAffectedTickets: 0,
      bestPerformingDay: '', worstPerformingDay: '', averageDailySales: 0, averageDailyProfit: 0,
      roi: 0, breakEvenPoint: 0, riskMetrics: { maxDailyLoss: 0, maxDailyProfit: 0, volatility: 0, sharpeRatio: 0 }
    },
    recentActivities: [],
    credit: { totalTx: 0, totalAmount: 0, totalTopups: 0, totalWithdrawals: 0, averageTransaction: 0, dailyTransactions: [], transactionTypes: [] },
    winning: { total: 0, totalPrize: 0, averagePrize: 0, payoutRate: 0, largestWin: 0, winningTickets: 0, winRate: 0, recentWins: [], winningsByType: [], dailyWinnings: [] },
    commission: {
      total: 0,
      totalPaid: 0,
      totalPending: 0,
      averageCommission: 0,
      commissionRate: 0,
      topEarners: [],
      dailyCommission: [],
      commissionByBranch: [],
      commissionTrends: []
    },
    analytics: { trends: { userGrowth: [], revenueGrowth: [], profitTrends: [] }, forecasts: { nextWeekRevenue: 0, nextWeekProfit: 0, nextMonthRevenue: 0, nextMonthProfit: 0, confidence: 0 }, segments: { userSegments: [], lotteryTypeSegments: [] } }
  }
} 