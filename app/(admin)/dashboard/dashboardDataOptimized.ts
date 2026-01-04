import { supabase } from '@/lib/supabase/supabaseClient'

// Cache สำหรับเก็บข้อมูลที่โหลดแล้ว
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(dateRange: string): string {
  return `dashboard-${dateRange}`
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 Using cached data')
    return cached.data
  }
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export interface DashboardDataOptimized {
  summary: {
    totalSales: number
    totalPayout: number
    netProfit: number
    totalBills: number
    totalPending: number
    totalUsers: number
    commissionTotal: number
  }
  dailyStats: Array<{
    date: string
    revenue: number
    payout: number
    netProfit: number
    bills: number
  }>
  lotteryTypes: Array<{
    name: string
    revenue: number
    count: number
  }>
  topUsers: Array<{
    name: string
    branch: string
    totalSpent: number
    ticketCount: number
  }>
}

// ฟังก์ชันหลัก - โหลดข้อมูลแบบ optimized
export async function fetchDashboardDataOptimized(dateRange: string = 'week'): Promise<DashboardDataOptimized> {
  const startTime = Date.now()
  console.log('🚀 Starting optimized dashboard fetch...')
  
  // Check cache first
  const cacheKey = getCacheKey(dateRange)
  const cached = getFromCache<DashboardDataOptimized>(cacheKey)
  if (cached) {
    return cached
  }

  const now = new Date()
  const daysBack = dateRange === 'day' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const startDateStr = startDate.toISOString().split('T')[0]

  try {
    // 🔥 Query ทั้งหมดพร้อมกัน (Parallel)
    const [
      ticketsResult,
      winningBillsResult,
      usersResult,
      profilesResult
    ] = await Promise.all([
      // 1. ดึง tickets ทั้งหมดในช่วงเวลา
      supabase
        .from('lottery_tickets')
        .select(`
          id,
          bill_number,
          total_amount,
          draw_date,
          status,
          user_id
        `)
        .gte('draw_date', startDateStr)
        .is('deleted_at', null)
        .order('draw_date', { ascending: false }),
      
      // 2. ดึง winning bills
      supabase
        .from('lottery_winning_bills')
        .select('bill_number, total_prize, draw_date')
        .gte('draw_date', startDateStr),
      
      // 3. นับจำนวน users ทั้งหมด
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      
      // 4. ดึง profiles สำหรับ top users
      supabase
        .from('profiles')
        .select('id, name, branch, percent')
    ])

    const tickets = ticketsResult.data || []
    const winningBills = winningBillsResult.data || []
    const totalUsers = usersResult.count || 0
    const profiles = profilesResult.data || []

    // สร้าง Map สำหรับค้นหาเร็ว
    const winningBillsMap = new Map<string, number>()
    winningBills.forEach((bill: any) => {
      winningBillsMap.set(bill.bill_number, Number(bill.total_prize || 0))
    })

    const profilesMap = new Map<string, any>()
    profiles.forEach((p: any) => {
      profilesMap.set(p.id, p)
    })

    // คำนวณ summary
    const confirmedTickets = tickets.filter((t: any) => t.status === 'confirmed')
    const pendingTickets = tickets.filter((t: any) => t.status === 'pending')

    let totalSales = 0
    let totalPayout = 0
    const dailyMap = new Map<string, { revenue: number; payout: number; bills: number }>()
    const userSalesMap = new Map<string, { totalSpent: number; ticketCount: number }>()

    confirmedTickets.forEach((ticket: any) => {
      const amount = Number(ticket.total_amount) || 0
      const payout = winningBillsMap.get(ticket.bill_number) || 0
      const dateStr = ticket.draw_date

      totalSales += amount
      totalPayout += payout

      // Daily stats
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { revenue: 0, payout: 0, bills: 0 })
      }
      const day = dailyMap.get(dateStr)!
      day.revenue += amount
      day.payout += payout
      day.bills += 1

      // User stats
      if (ticket.user_id) {
        if (!userSalesMap.has(ticket.user_id)) {
          userSalesMap.set(ticket.user_id, { totalSpent: 0, ticketCount: 0 })
        }
        const userStats = userSalesMap.get(ticket.user_id)!
        userStats.totalSpent += amount
        userStats.ticketCount += 1
      }
    })

    // คำนวณ commission (ใช้ percent จาก profiles)
    let commissionTotal = 0
    userSalesMap.forEach((stats, userId) => {
      const profile = profilesMap.get(userId)
      const percent = profile?.percent || 0
      commissionTotal += stats.totalSpent * (percent / 100)
    })

    // สร้าง daily stats array
    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        payout: stats.payout,
        netProfit: stats.revenue - stats.payout,
        bills: stats.bills
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // สร้าง top users
    const topUsers = Array.from(userSalesMap.entries())
      .map(([userId, stats]) => {
        const profile = profilesMap.get(userId)
        return {
          name: profile?.name || 'ไม่ระบุ',
          branch: profile?.branch || 'ไม่ระบุ',
          totalSpent: stats.totalSpent,
          ticketCount: stats.ticketCount
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    const result: DashboardDataOptimized = {
      summary: {
        totalSales,
        totalPayout,
        netProfit: totalSales - totalPayout,
        totalBills: confirmedTickets.length,
        totalPending: pendingTickets.length,
        totalUsers,
        commissionTotal
      },
      dailyStats,
      lotteryTypes: [], // จะเพิ่มทีหลังถ้าต้องการ
      topUsers
    }

    // Cache result
    setCache(cacheKey, result)

    const elapsed = Date.now() - startTime
    console.log(`✅ Dashboard data loaded in ${elapsed}ms`)

    return result

  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error)
    return {
      summary: {
        totalSales: 0,
        totalPayout: 0,
        netProfit: 0,
        totalBills: 0,
        totalPending: 0,
        totalUsers: 0,
        commissionTotal: 0
      },
      dailyStats: [],
      lotteryTypes: [],
      topUsers: []
    }
  }
}

// Export สำหรับ clear cache
export function clearDashboardCache() {
  cache.clear()
  console.log('🗑️ Dashboard cache cleared')
}
