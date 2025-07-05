"use client"
import { Button } from '@/components/ui/button'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  data: any[]
  filename: string
  type?: 'csv' | 'xlsx'
  children?: React.ReactNode
}

export default function ExportButton({ data, filename, type = 'csv', children }: ExportButtonProps) {
  const handleExport = () => {
    if (type === 'csv') {
      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', filename.endsWith('.csv') ? filename : filename + '.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (type === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx')
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="ml-2">
      {children || 'Export'}
    </Button>
  )
} 