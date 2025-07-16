"use client"
import React from 'react'
import { Pie, Doughnut } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

ChartJS.register(ArcElement, Tooltip, Legend)

interface LotteryTypePieProps {
  labels: string[]
  values: number[]
  colors?: string[]
  showLegend?: boolean
  chartType?: 'pie' | 'doughnut'
  animationDuration?: number
  title?: string
  showPercentage?: boolean
}

const defaultColors = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
]

export default function LotteryTypePie({ 
  labels, 
  values, 
  colors = defaultColors,
  showLegend = true,
  chartType = 'doughnut',
  animationDuration = 1000,
  title = 'สัดส่วนประเภทหวย',
  showPercentage = true
}: LotteryTypePieProps) {
  const total = values.reduce((sum, value) => sum + value, 0)
  
  const chartData = {
    labels: labels.map((label, index) => {
      const percentage = total > 0 ? ((values[index] / total) * 100).toFixed(1) : '0'
      return showPercentage ? `${label} (${percentage}%)` : label
    }),
    datasets: [
      {
        label: 'จำนวน',
        data: values,
        backgroundColor: colors.slice(0, values.length).map(color => color + '80'), // Add transparency
        borderColor: colors.slice(0, values.length),
        borderWidth: 2,
        hoverBackgroundColor: colors.slice(0, values.length),
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 3,
        cutout: chartType === 'doughnut' ? '50%' : '0%',
      },
    ],
  }

  const options: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: animationDuration,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels?.length && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: label as string,
                fillStyle: data.datasets[0].backgroundColor?.[i] as string,
                strokeStyle: data.datasets[0].borderColor?.[i] as string,
                lineWidth: 2,
                hidden: false,
                index: i,
              }))
            }
            return []
          },
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
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            
            return [
              `${label.split(' (')[0]}`,
              `จำนวน: ${value.toLocaleString()} รายการ`,
              `สัดส่วน: ${percentage}%`
            ]
          },
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

  const ChartComponent = chartType === 'pie' ? Pie : Doughnut

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <div className="relative h-full">
        <ChartComponent data={chartData} options={options} />
        
        {/* Center text for doughnut chart */}
        {chartType === 'doughnut' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                รายการทั้งหมด
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {labels.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ประเภทหวย
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {values.length > 0 ? Math.max(...values).toLocaleString() : 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ยอดขายสูงสุด
          </div>
        </div>
      </div>
    </motion.div>
  )
} 