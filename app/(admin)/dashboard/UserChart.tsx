"use client"
import React from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
)

interface UserChartProps {
  labels: string[]
  newUsers: number[]
  activeUsers: number[]
  chartType?: 'bar' | 'line'
  showGradient?: boolean
  animationDuration?: number
  title?: string
  showComparison?: boolean
}

export default function UserChart({ 
  labels, 
  newUsers, 
  activeUsers,
  chartType = 'bar',
  showGradient = true,
  animationDuration = 1000,
  title = 'ผู้ใช้งานใหม่และ Active รายเดือน',
  showComparison = true
}: UserChartProps) {
  
  const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, color + '80')
    gradient.addColorStop(1, color + '20')
    return gradient
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'ผู้ใช้งานใหม่',
        data: newUsers,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx
          return showGradient ? createGradient(ctx, '#EF4444') : '#EF4444' + '80'
        },
        borderColor: '#EF4444',
        borderWidth: 2,
        borderRadius: chartType === 'bar' ? 8 : 0,
        borderSkipped: false,
        fill: chartType === 'line',
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: chartType === 'line' ? 6 : 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#EF4444',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
      {
        label: 'Active 30 วัน',
        data: activeUsers,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx
          return showGradient ? createGradient(ctx, '#10B981') : '#10B981' + '80'
        },
        borderColor: '#10B981',
        borderWidth: 2,
        borderRadius: chartType === 'bar' ? 8 : 0,
        borderSkipped: false,
        fill: chartType === 'line',
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: chartType === 'line' ? 6 : 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#10B981',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
    ],
  }

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: animationDuration,
      easing: 'easeOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 600,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return `${context[0].label}`
          },
          label: (context) => {
            const value = context.parsed.y || 0
            const datasetIndex = context.datasetIndex
            const isNewUser = datasetIndex === 0
            const maxValue = Math.max(...(isNewUser ? newUsers : activeUsers))
            const percentage = maxValue > 0 ? ((value / maxValue) * 100).toFixed(1) : '0'
            
            return [
              `${context.dataset.label}: ${value.toLocaleString()} คน`,
              `เปอร์เซ็นต์: ${percentage}% ของยอดสูงสุด`
            ]
          },
          afterLabel: (context) => {
            const index = context.dataIndex
            const datasetIndex = context.datasetIndex
            const currentData = datasetIndex === 0 ? newUsers : activeUsers
            const total = currentData.reduce((sum, val) => sum + val, 0)
            const percentage = total > 0 ? ((currentData[index] / total) * 100).toFixed(1) : '0'
            return `สัดส่วน: ${percentage}% ของยอดรวม`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: 500,
          },
          padding: 10,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (value) => {
            return Number(value).toLocaleString()
          },
          font: {
            size: 11,
            weight: 500,
          },
          padding: 10,
        },
      },
    },
    onHover: (event, elements) => {
      if (event.native?.target) {
        (event.native.target as HTMLElement).style.cursor = elements.length > 0 ? 'pointer' : 'default'
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index
        const datasetIndex = elements[0].datasetIndex
        const isNewUser = datasetIndex === 0
        const value = isNewUser ? newUsers[index] : activeUsers[index]
        console.log('Clicked on:', labels[index], 'Value:', value, 'Type:', isNewUser ? 'New' : 'Active')
      }
    },
  }

  const ChartComponent = chartType === 'bar' ? Bar : Line

  const totalNewUsers = newUsers.reduce((sum, val) => sum + val, 0)
  const totalActiveUsers = activeUsers.reduce((sum, val) => sum + val, 0)
  const avgNewUsers = newUsers.reduce((sum, val) => sum + val, 0) / newUsers.length
  const avgActiveUsers = activeUsers.reduce((sum, val) => sum + val, 0) / activeUsers.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <div className="relative h-full">
        <ChartComponent data={chartData} options={options} />
      </div>
      
      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ผู้ใช้งานใหม่
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">
                {totalNewUsers.toLocaleString()}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">
                ยอดรวม
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">
                {Math.round(avgNewUsers).toLocaleString()}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">
                เฉลี่ย
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ผู้ใช้งาน Active
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
              <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                {totalActiveUsers.toLocaleString()}
              </div>
              <div className="text-xs text-green-600 dark:text-green-500">
                ยอดรวม
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
              <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                {Math.round(avgActiveUsers).toLocaleString()}
              </div>
              <div className="text-xs text-green-600 dark:text-green-500">
                เฉลี่ย
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 