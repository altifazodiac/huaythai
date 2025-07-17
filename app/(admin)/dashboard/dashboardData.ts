import { supabase } from '@/lib/supabase/supabaseClient'
import { calculateWinningsForItem, createResultsMap } from '@/lib/utils/lottery-utils'

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
    topBranches: Array<{
      branch: string
      userCount: number
      totalSpent: number
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
    
    // โหลดผลรางวัลของช่วงเวลาที่ต้องการ เหมือน summary
    const resultsMap = await createResultsMap(supabase, startDate.toISOString())

    // Fetch all required data in parallel for better performance
    const [
      usersData,
      ticketsData,
      creditData,
      lotteryTypesData,
      winningsData,
      profilesData,
      recentActivitiesData
    ] = await Promise.all([
      fetchUsersData(startDate, previousStartDate),
      fetchTicketsData(startDate, previousStartDate, resultsMap),
      fetchCreditData(startDate, previousStartDate),
      fetchLotteryTypesData(startDate, previousStartDate),
      fetchWinningsData(startDate, previousStartDate),
      fetchProfilesData(startDate, previousStartDate),
      fetchRecentActivitiesData(startDate)
    ])

    // Calculate comprehensive performance metrics
    const performance = calculatePerformanceMetrics(
      ticketsData.dailyStats,
      ticketsData.totalRevenue,
      ticketsData.totalPayout,
      ticketsData.totalOriginalPayout,
      daysBack
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
      analytics
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return getEmptyDashboardData()
  }
}

// ฟังก์ชันใหม่: ใช้ logic เหมือน summary/page.tsx ทุกประการ
export async function fetchDashboardSummary(startDate: Date, endDate: Date) {
  // โหลดผลรางวัลของช่วงเวลาที่ต้องการ
  const resultsMap = await createResultsMap(supabase, startDate.toISOString())

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

  // Fetch top branches
  const { data: branchData } = await supabase
    .from('profiles')
    .select(`
      branch,
      credit_transactions(amount, transaction_type)
    `)
    .not('branch', 'is', null)

  const topBranches = (branchData || []).reduce((acc: any, profile: any) => {
    const branch = profile.branch || 'ไม่ระบุ'
    if (!acc[branch]) {
      acc[branch] = { branch, userCount: 0, totalSpent: 0 }
    }
    acc[branch].userCount += 1
    
    const totalSpent = (profile.credit_transactions || [])
      .filter((tx: any) => tx.transaction_type === 'purchase')
      .reduce((sum: number, tx: any) => sum + globalThis.Number(tx.amount), 0)
    
    acc[branch].totalSpent += totalSpent
    return acc
  }, {})

  const topBranchesArray = Object.values(topBranches).map((branch: any) => ({
    ...branch,
    avgSpent: branch.userCount > 0 ? branch.totalSpent / branch.userCount : 0
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
    topBranches: topBranchesArray
  }
}

// Helper function to fetch tickets data
async function fetchTicketsData(startDate: Date, previousStartDate: Date, resultsMap: Record<string, any>) {
  const now = new Date()
  
  // Fetch tickets with comprehensive data
  const { data: tickets } = await supabase
    .from('lottery_tickets')
    .select(`
      id,
      total_amount,
      created_at,
      draw_date,
      status,
      bill_number,
      lottery_ticket_items!inner(
        id,
        amount,
        original_amount,
        effective_prize_rate,
        number_cap_action,
        number_cap_status,
        numbers,
        lottery_sub_number!inner(
          id,
          digit_number,
          type_number,
          price_paid
        ),
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        )
      ),
      profiles!inner(name, branch)
    `)
    .gte('draw_date', previousStartDate.toISOString())
    .order('created_at', { ascending: false })

  // Filter tickets เฉพาะ status 'confirmed' และใช้ draw_date เหมือน summary
  const currentPeriodTickets = tickets?.filter(t => 
    new Date(t.draw_date) >= startDate && t.status === 'confirmed'
  ) || []
  
  const previousPeriodTickets = tickets?.filter(t => 
    new Date(t.draw_date) >= previousStartDate && 
    new Date(t.draw_date) < startDate && t.status === 'confirmed'
  ) || []

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
      ticket.lottery_ticket_items?.forEach((item: any) => {
        // ใช้ฟังก์ชันเดียวกับ summary: calculateWinningsForItem อิงผลรางวัลจริง
        const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap)
        dayActualPayout += prize

        // Calculate original payout (without number cap)
        const originalRate = item.lottery_sub_number?.price_paid || 0
        const { prize: originalPrize } = calculateWinningsForItem(
          { ...item, effective_prize_rate: originalRate }, 
          ticket.draw_date, 
          resultsMap
        )
        dayOriginalPayout += originalPrize

        if (item.number_cap_action) {
          dayNumberCapCount++
        }
      })
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
  const monthlyComparison = calculateMonthlyComparison(tickets || [])

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
    revenueByType,
    monthlyComparison,
    numberCapAffectedTickets
  }
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(
  dailyStats: any[],
  totalSales: number,
  totalPayout: number,
  totalOriginalPayout: number,
  daysBack: number
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
    numberCapAffectedTickets: 0, // Would be calculated in tickets data
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
      const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap)
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

async function fetchLotteryTypesData(startDate: Date, previousStartDate: Date) {
  // Implementation for lottery types data
  return {
    total: 0,
    popular: [],
    performance: [],
    dailyPerformance: []
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
  const { data: recentActivities } = await supabase
    .from('lottery_tickets')
    .select(`
      id,
      total_amount,
      created_at,
      status,
      bill_number,
      profiles(name)
    `)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  return (recentActivities || []).map((activity: any) => ({
    id: activity.id,
    type: 'ticket_purchase',
    description: `${activity.profiles?.name || 'ผู้ใช้'} ซื้อหวย`,
    timestamp: activity.created_at,
    amount: globalThis.Number(activity.total_amount),
    user: activity.profiles?.name || 'ไม่ระบุ',
    status: activity.status,
    metadata: {
      billNumber: activity.bill_number
    }
  }))
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
    users: { total: 0, newThisMonth: 0, active: 0, growthRate: 0, dailyStats: [], topBranches: [] },
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
    analytics: { trends: { userGrowth: [], revenueGrowth: [], profitTrends: [] }, forecasts: { nextWeekRevenue: 0, nextWeekProfit: 0, nextMonthRevenue: 0, nextMonthProfit: 0, confidence: 0 }, segments: { userSegments: [], lotteryTypeSegments: [] } }
  }
} 