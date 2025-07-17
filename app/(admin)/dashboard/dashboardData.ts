import { supabase } from '@/lib/supabase/supabaseClient'
import { calculateWinningsForItem, createResultsMap } from '@/lib/utils/lottery-utils'; // 🔧 **ใหม่**

export interface DashboardData {
  users: {
    total: number;
    newThisMonth: number;
    active: number;
    growthRate: number;
    dailyStats: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
    }>;
  };
  revenue: {
    total: number;
    growth: number;
    byDrawDate: Record<string, number>;
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      tickets: number;
      payout: number;
      originalPayout: number;
      netProfit: number;
      numberCapSavings: number;
      avgTicketValue: number;
    }>;
    monthlyComparison: Array<{
      month: string;
      revenue: number;
      previousMonth: number;
      growthRate: number;
    }>;
  };
  tickets: {
    sold: number;
    sales: number;
    pending: number;
    growthRate: number;
    dailyStats: Array<{
      date: string;
      sold: number;
      revenue: number;
      avgTicketValue: number;
    }>;
    typeDistribution: Array<{
      type: string;
      count: number;
      revenue: number;
      percentage: number;
    }>;
  };
  lotteryTypes: {
    total: number;
    popular: Array<{
      name: string;
      country: string;
      count: number;
      revenue: number;
      growthRate: number;
    }>;
    performance: Array<{
      type: string;
      avgSales: number;
      totalSales: number;
      winRate: number;
    }>;
  };
  performance: {
    totalSales: number;
    totalPayout: number;
    totalOriginalPayout: number;
    netProfit: number;
    profitMargin: number;
    numberCapSavings: number;
    numberCapSavingsPercentage: number;
    numberCapAffectedTickets: number;
    bestPerformingDay: string;
    worstPerformingDay: string;
    averageDailySales: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    amount?: number;
    user?: string;
  }>;
  credit: {
    totalTx: number;
    totalAmount: number;
    averageTransaction: number;
    dailyTransactions: Array<{
      date: string;
      deposits: number;
      withdrawals: number;
      netFlow: number;
    }>;
  };
  winning: {
    total: number;
    totalPrize: number;
    averagePrize: number;
    payoutRate: number;
    largestWin: number;
    recentWins: Array<{
      date: string;
      amount: number;
      type: string;
      user: string;
      bill_number: string; // 🔧 **ใหม่**
    }>;
  };
}

export async function fetchDashboardData(dateRange: string = 'week'): Promise<DashboardData> {
  try {
    const now = new Date();
    const daysBack = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    // 🔧 **ใหม่**: ดึงผลรางวัลและสร้าง Map
    const resultsMap = await createResultsMap(supabase, startDate.toISOString());

    // 1. Enhanced Users Data
    const { data: users, count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    const { data: newUsersMonth } = await supabase
      .from('profiles')
      .select('*')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())

    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('*')
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Daily user stats
    const dailyUserStats = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: dayNewUsers } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString())
      
      dailyUserStats.push({
        date: dayStart.toISOString().split('T')[0],
        newUsers: dayNewUsers?.length || 0,
        activeUsers: Math.floor(Math.random() * 50) + 10 // Placeholder
      });
    }

    // 2. Enhanced Revenue Data
    const { data: ticketsRevenue } = await supabase
      .from('lottery_tickets')
      .select(`
        id,
        total_amount,
        created_at,
        draw_date,
        status,
        lottery_ticket_items!inner(
          id,
          amount,
          original_amount,
          effective_prize_rate,
          number_cap_action,
          number_cap_status,
          lottery_sub_number!inner(price_paid),
          lottery_sub_types!inner(sub_type_name)
        ),
        profiles!inner(name)
      `)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'confirmed');

    // คำนวณรายได้และข้อมูลสถิติโดยใช้ effective_prize_rate
    const revenueByDate: Record<string, number> = {};
    const dailyRevenueStats = [];
    let totalRevenue = 0;
    let totalPayout = 0; // 🔧 **แก้ไข**: เปลี่ยนชื่อเป็น totalPayout
    let totalOriginalPayout = 0; // 🔧 **แก้ไข**: เปลี่ยนชื่อเป็น totalOriginalPayout
    let numberCapAffectedTickets = 0;
    const recentWins: DashboardData['winning']['recentWins'] = [];


    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTickets = ticketsRevenue?.filter(t => 
        t.created_at.startsWith(dateStr)
      ) || [];
      
      const dayRevenue = dayTickets.reduce((sum, ticket) => sum + (ticket.total_amount || 0), 0);
      const dayTicketCount = dayTickets.length;
      
      // 🔧 **ปรับปรุง**: คำนวณ Payout จากผลรางวัลจริง
      let dayActualPayout = 0;
      let dayOriginalPayout = 0;
      let dayNumberCapCount = 0;
      
      dayTickets.forEach(ticket => {
        if (ticket.lottery_ticket_items) {
          ticket.lottery_ticket_items.forEach((item: any) => {
            // คำนวณเงินรางวัลจริง
            const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
            dayActualPayout += prize;

            // คำนวณเงินรางวัลที่ควรจะเป็น (หากไม่มีเลขอั้น)
            const originalRate = item.lottery_sub_number?.price_paid || 0;
            const { prize: originalPrize } = calculateWinningsForItem({ ...item, effective_prize_rate: originalRate }, ticket.draw_date, resultsMap);
            dayOriginalPayout += originalPrize;

            if (item.number_cap_action) {
              dayNumberCapCount++;
            }

            // เพิ่มลงใน recentWins
            if (prize > 0 && recentWins.length < 10) {
              recentWins.push({
                date: ticket.draw_date,
                amount: prize,
                type: item.lottery_sub_types?.sub_type_name || 'N/A',
                user: ticket.profiles?.name || 'N/A',
                bill_number: ticket.bill_number,
              });
            }
          });
        }
      });
      
      revenueByDate[dateStr] = dayRevenue;
      totalRevenue += dayRevenue;
      totalPayout += dayActualPayout; // ใช้ Payout จริง
      totalOriginalPayout += dayOriginalPayout; // ใช้ Original Payout
      numberCapAffectedTickets += dayNumberCapCount;
      
      dailyRevenueStats.push({
        date: dateStr,
        revenue: dayRevenue,
        tickets: dayTicketCount,
        payout: dayActualPayout, // ใช้ Payout จริง
        originalPayout: dayOriginalPayout, // เก็บไว้เพื่อเปรียบเทียบ
        netProfit: dayRevenue - dayActualPayout,
        numberCapSavings: dayOriginalPayout - dayActualPayout, // เงินที่ประหยัดได้จากเลขอั้น
        avgTicketValue: dayTicketCount > 0 ? dayRevenue / dayTicketCount : 0
      });
    }

    // คำนวณเปอร์เซ็นต์การประหยัดจากเลขอั้น
    const numberCapSavingsPercentage = totalOriginalPayout > 0 
      ? ((totalOriginalPayout - totalPayout) / totalOriginalPayout) * 100 
      : 0;

    const bestPerformingDay = dailyRevenueStats.length > 0 
      ? dailyRevenueStats.reduce((max, day) => day.revenue > max.revenue ? day : max, dailyRevenueStats[0])
      : { date: '', revenue: 0 };
    
    const worstPerformingDay = dailyRevenueStats.length > 0
      ? dailyRevenueStats.reduce((min, day) => day.revenue < min.revenue ? day : min, dailyRevenueStats[0])
      : { date: '', revenue: 0 };

    // 3. Enhanced Tickets Data
    const { data: ticketsSold } = await supabase
      .from('lottery_tickets')
      .select('id, total_amount, draw_date')
      .eq('status', 'confirmed')
      .gte('draw_date', startDate.toISOString().split('T')[0])
    
    const totalTicketsSold = ticketsSold?.length || 0
    const totalSales = ticketsSold?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0

    const { data: ticketsPending } = await supabase
      .from('lottery_tickets')
      .select('id')
      .eq('status', 'pending')
    
    const totalTicketsPending = ticketsPending?.length || 0

    // Ticket type distribution
    const { data: ticketTypes } = await supabase
      .from('lottery_tickets')
      .select(`
        lottery_sub_type_id,
        total_amount,
        lottery_sub_types(name, country_origin)
      `)
      .eq('status', 'confirmed')
      .gte('draw_date', startDate.toISOString().split('T')[0])

    const typeDistribution = (ticketTypes || []).reduce((acc: any, ticket: any) => {
      const typeName = ticket.lottery_sub_types?.name || 'Unknown';
      if (!acc[typeName]) {
        acc[typeName] = { type: typeName, count: 0, revenue: 0 };
      }
      acc[typeName].count += 1;
      acc[typeName].revenue += Number(ticket.total_amount);
      return acc;
    }, {});

    const typeDistributionArray = Object.values(typeDistribution).map((item: any) => ({
      ...item,
      percentage: totalSales > 0 ? (item.revenue / totalSales) * 100 : 0
    }));

    // 4. Enhanced Lottery Types Data
    const { data: lotteryTypes } = await supabase
      .from('lottery_sub_types')
      .select(`
        id,
        name,
        country_origin,
        lottery_tickets(total_amount, status)
      `)

    const popularTypes = (lotteryTypes || []).map((type: any) => {
      const confirmedTickets = type.lottery_tickets?.filter((t: any) => t.status === 'confirmed') || [];
      const revenue = confirmedTickets.reduce((sum: number, t: any) => sum + Number(t.total_amount), 0);
      
      return {
        name: type.name,
        country: type.country_origin,
        count: confirmedTickets.length,
        revenue: revenue,
        growthRate: Math.random() * 20 - 10 // Placeholder
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // 5. Performance Metrics
    const netProfit = totalSales - totalPayout;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // 6. Recent Activities
    const { data: recentActivities } = await supabase
      .from('lottery_tickets')
      .select(`
        id,
        total_amount,
        created_at,
        status,
        profiles(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    const formattedActivities = (recentActivities || []).map((activity: any) => ({
      id: activity.id,
      type: 'ticket_purchase',
      description: `${activity.profiles?.name || 'Unknown'} ซื้อหวย`,
      timestamp: activity.created_at,
      amount: Number(activity.total_amount),
      user: activity.profiles?.name || 'Unknown'
    }));

    // 7. Credit Transactions
    const { data: creditTx } = await supabase
      .from('credit_transactions')
      .select('amount, transaction_type, created_at')
      .gte('created_at', startDate.toISOString())
    
    const totalCreditTx = creditTx?.length || 0
    const totalCreditAmount = creditTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const averageTransaction = totalCreditTx > 0 ? totalCreditAmount / totalCreditTx : 0

    // 8. Winning Data
    const { data: winningBills } = await supabase
      .from('lottery_winning_bills')
      .select('total_prize, created_at')
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString())
    
    const totalWinningBills = winningBills?.length || 0
    const totalPrizePaid = winningBills?.reduce((sum, b) => sum + Number(b.total_prize), 0) || 0
    const averagePrize = totalWinningBills > 0 ? totalPrizePaid / totalWinningBills : 0
    const largestWin = winningBills?.reduce((max, b) => Math.max(max, Number(b.total_prize)), 0) || 0

    // Calculate growth rates
    const userGrowthRate = newUsersMonth ? (newUsersMonth.length / (totalUsers || 1)) * 100 : 0;
    const ticketGrowthRate = Math.random() * 20 - 10; // Placeholder

    return {
      users: {
        total: totalUsers || 0,
        newThisMonth: newUsersMonth?.length || 0,
        active: activeUsers?.length || 0,
        growthRate: userGrowthRate,
        dailyStats: dailyUserStats.reverse()
      },
      revenue: {
        total: totalRevenue,
        growth: Math.random() * 20 - 10, // Placeholder
        byDrawDate: revenueByDate,
        dailyRevenue: dailyRevenueStats.reverse(),
        monthlyComparison: [] // Placeholder
      },
      tickets: {
        sold: totalTicketsSold,
        sales: totalSales,
        pending: totalTicketsPending,
        growthRate: ticketGrowthRate,
        dailyStats: dailyRevenueStats.map(d => ({
          date: d.date,
          sold: d.tickets,
          revenue: d.revenue,
          avgTicketValue: d.tickets > 0 ? d.revenue / d.tickets : 0
        })),
        typeDistribution: typeDistributionArray
      },
      lotteryTypes: {
        total: lotteryTypes?.length || 0,
        popular: popularTypes,
        performance: [] // Placeholder
      },
      performance: {
        totalSales: totalRevenue,
        totalPayout: totalPayout, // ใช้ payout จริง
        totalOriginalPayout: totalOriginalPayout, // เก็บไว้เพื่อเปรียบเทียบ
        netProfit: totalRevenue - totalPayout,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalPayout) / totalRevenue) * 100 : 0,
        numberCapSavings: totalOriginalPayout - totalPayout, // เงินที่ประหยัดได้
        numberCapSavingsPercentage,
        numberCapAffectedTickets,
        bestPerformingDay: bestPerformingDay.date,
        worstPerformingDay: worstPerformingDay.date,
        averageDailySales: totalRevenue / daysBack,
      },
      recentActivities: formattedActivities,
      credit: {
        totalTx: totalCreditTx,
        totalAmount: totalCreditAmount,
        averageTransaction: averageTransaction,
        dailyTransactions: [] // Placeholder
      },
      winning: {
        total: totalWinningBills || 0,
        totalPrize: totalPayout, // ใช้ Payout จริง
        averagePrize: totalWinningBills > 0 ? totalPayout / totalWinningBills : 0,
        payoutRate: totalRevenue > 0 ? (totalPayout / totalRevenue) * 100 : 0,
        largestWin: largestWin,
        recentWins: recentWins.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return empty data structure on error
    return {
      users: { total: 0, newThisMonth: 0, active: 0, growthRate: 0, dailyStats: [] },
      revenue: { total: 0, growth: 0, byDrawDate: {}, dailyRevenue: [], monthlyComparison: [] },
      tickets: { sold: 0, sales: 0, pending: 0, growthRate: 0, dailyStats: [], typeDistribution: [] },
      lotteryTypes: { total: 0, popular: [], performance: [] },
      performance: { totalSales: 0, totalPayout: 0, netProfit: 0, profitMargin: 0, bestPerformingDay: '', worstPerformingDay: '', averageDailySales: 0 },
      recentActivities: [],
      credit: { totalTx: 0, totalAmount: 0, averageTransaction: 0, dailyTransactions: [] },
      winning: { total: 0, totalPrize: 0, averagePrize: 0, payoutRate: 0, largestWin: 0, recentWins: [] }
    };
  }
} 