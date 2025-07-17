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

interface RevenueChartProps {
  labels: string[]
  values: number[]
  chartType?: 'bar' | 'line'
  showGradient?: boolean
  animationDuration?: number
  title?: string
  color?: string
  showComparison?: boolean
  comparisonData?: number[]
  comparisonLabel?: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export default function RevenueChart({ 
  labels, 
  values, 
  chartType = 'bar',
  showGradient = true,
  animationDuration = 1000,
  title = 'กราฟรายได้ตามวัน',
  color = '#4F46E5',
  showComparison = false,
  comparisonData = [],
  comparisonLabel = 'เปรียบเทียบ'
}: RevenueChartProps) {
  
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
        label: 'รายได้ (บาท)',
        data: values,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx
          return showGradient ? createGradient(ctx, color) : color + '80'
        },
        borderColor: color,
        borderWidth: 2,
        borderRadius: chartType === 'bar' ? 8 : 0,
        borderSkipped: false,
        fill: chartType === 'line',
        tension: 0.4,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: chartType === 'line' ? 6 : 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
      ...(showComparison && comparisonData.length > 0 ? [{
        label: comparisonLabel,
        data: comparisonData,
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
      }] : []),
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
        display: showComparison,
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
            const percentage = values.length > 0 ? 
              ((value / Math.max(...values)) * 100).toFixed(1) : '0'
            
            return [
              `${context.dataset.label}: ${formatCurrency(value)}`,
              `เปอร์เซ็นต์: ${percentage}% ของยอดสูงสุด`
            ]
          },
          afterLabel: (context) => {
            const index = context.dataIndex
            const total = values.reduce((sum, val) => sum + val, 0)
            const percentage = total > 0 ? ((values[index] / total) * 100).toFixed(1) : '0'
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
            return formatCurrency(Number(value))
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
        console.log('Clicked on:', labels[index], 'Value:', values[index])
      }
    },
  }

  const ChartComponent = chartType === 'bar' ? Bar : Line

  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length

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
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
          <div className="text-sm font-semibold text-green-700 dark:text-green-400">
            {formatCurrency(maxValue)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-500">
            สูงสุด
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
          <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
            {formatCurrency(avgValue)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-500">
            เฉลี่ย
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded-lg">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-400">
            {formatCurrency(minValue)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-500">
            ต่ำสุด
          </div>
        </div>
      </div>
    </motion.div>
  )
} 