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

export default function RevenueChart({ labels, values }: { labels: string[]; values: number[] }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'รายได้ (บาท)',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  }
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'กราฟรายได้ตามวัน' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  }
  return <Bar data={data} options={options} />
} 