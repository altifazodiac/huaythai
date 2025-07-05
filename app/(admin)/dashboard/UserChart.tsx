"use client"
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function UserChart({ labels, newUsers, activeUsers }: { labels: string[]; newUsers: number[]; activeUsers: number[] }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'ผู้ใช้งานใหม่',
        data: newUsers,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
      {
        label: 'Active 30 วัน',
        data: activeUsers,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  }
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'ผู้ใช้งานใหม่และ Active รายเดือน' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  }
  return <Bar data={data} options={options} />
} 