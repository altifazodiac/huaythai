import { supabase } from '@/lib/supabase/supabaseClient'

export async function fetchDashboardData() {
  // 1. Users
  const { data: users, count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })

  const { data: newUsersMonth } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { data: activeUsers } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // 2. Revenue (credit_transactions)
  const { data: revenueData } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('transaction_type', 'deposit')
  const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // 3. Tickets
  const { data: ticketsSold } = await supabase
    .from('lottery_tickets')
    .select('id, total_amount')
    .eq('status', 'confirmed')
  const totalTicketsSold = ticketsSold?.length || 0
  const totalSales = ticketsSold?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0

  const { data: ticketsPending } = await supabase
    .from('lottery_tickets')
    .select('id')
    .eq('status', 'pending')
  const totalTicketsPending = ticketsPending?.length || 0

  // 4. Revenue by draw_date (last 12)
  const { data: revenueByDate } = await supabase
    .from('lottery_tickets')
    .select('draw_date, total_amount')
    .eq('status', 'confirmed')
  const revenueByDrawDate = (revenueByDate || []).reduce((acc, t) => {
    if (!t.draw_date) return acc
    acc[t.draw_date] = (acc[t.draw_date] || 0) + Number(t.total_amount)
    return acc
  }, {} as Record<string, number>)

  // 5. Recent Activities (lottery_ticket_items)
  const { data: recentActivities } = await supabase
    .from('lottery_ticket_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // 6. Credit Transactions (last 30 days)
  const { data: creditTx } = await supabase
    .from('credit_transactions')
    .select('amount')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const totalCreditTx = creditTx?.length || 0
  const totalCreditAmount = creditTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // 7. Lottery Types
  const { data: lotteryTypes } = await supabase
    .from('lottery_types')
    .select('lottery_type_id')
  const totalLotteryTypes = lotteryTypes?.length || 0

  // 8. Winning Bills
  const { data: winningBills } = await supabase
    .from('lottery_winning_bills')
    .select('total_prize')
    .eq('status', 'paid')
  const totalWinningBills = winningBills?.length || 0
  const totalPrizePaid = winningBills?.reduce((sum, b) => sum + Number(b.total_prize), 0) || 0

  return {
    users: { total: totalUsers || 0, newThisMonth: newUsersMonth?.length || 0, active: activeUsers?.length || 0 },
    revenue: { total: totalRevenue, byDrawDate: revenueByDrawDate },
    tickets: { sold: totalTicketsSold, sales: totalSales, pending: totalTicketsPending },
    recentActivities: recentActivities || [],
    credit: { totalTx: totalCreditTx, totalAmount: totalCreditAmount },
    lotteryTypes: totalLotteryTypes,
    winning: { total: totalWinningBills, totalPrize: totalPrizePaid },
  }
} 