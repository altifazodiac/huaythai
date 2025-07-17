"use client"
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  CheckCircle,
  Loader2,
  ChevronDown,
  Calendar,
  BarChart3
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  data: any[]
  filename: string
  type?: 'csv' | 'xlsx' | 'json'
  children?: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showProgress?: boolean
  onExportStart?: () => void
  onExportComplete?: () => void
}

const exportTypes = [
  {
    value: 'csv',
    label: 'CSV File',
    icon: FileText,
    description: 'Comma-separated values',
    extension: '.csv'
  },
  {
    value: 'xlsx',
    label: 'Excel File',
    icon: FileSpreadsheet,
    description: 'Microsoft Excel format',
    extension: '.xlsx'
  },
  {
    value: 'json',
    label: 'JSON File',
    icon: FileJson,
    description: 'JavaScript Object Notation',
    extension: '.json'
  }
]

export default function ExportButton({ 
  data, 
  filename, 
  type = 'csv', 
  children, 
  variant = 'outline',
  size = 'sm',
  className = '',
  showProgress = true,
  onExportStart,
  onExportComplete
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportType, setExportType] = useState(type)

  const handleExport = async (selectedType: string) => {
    try {
      setIsExporting(true)
      onExportStart?.()
      
      // Simulate processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const timestamp = new Date().toISOString().split('T')[0]
      const baseFilename = `${filename}-${timestamp}`
      
      if (selectedType === 'csv') {
        const csv = Papa.unparse(data)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.setAttribute('download', `${baseFilename}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (selectedType === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Data')
        XLSX.writeFile(wb, `${baseFilename}.xlsx`)
      } else if (selectedType === 'json') {
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.setAttribute('download', `${baseFilename}.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      setExportSuccess(true)
      onExportComplete?.()
      
      // Reset success state after 2 seconds
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const singleExportHandler = () => {
    handleExport(exportType)
  }

  const currentExportType = exportTypes.find(t => t.value === exportType)
  const IconComponent = currentExportType?.icon || Download

  return (
    <div className={`inline-flex ${className}`}>
      {children ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size="sm"
              disabled={isExporting || !data.length}
              className="relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {isExporting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    กำลังส่งออก...
                  </motion.div>
                ) : exportSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center text-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    เสร็จสิ้น
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {children}
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              ส่งออกรายงาน
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {exportTypes.map((exportType) => {
              const IconComponent = exportType.icon
              return (
                <DropdownMenuItem
                  key={exportType.value}
                  onClick={() => handleExport(exportType.value)}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <IconComponent className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{exportType.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {exportType.description}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {exportType.extension}
                  </Badge>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <div className="text-xs text-muted-foreground flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {data.length} รายการ
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant={variant}
          size="sm"
          onClick={singleExportHandler}
          disabled={isExporting || !data.length}
          className="relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {isExporting ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                กำลังส่งออก...
              </motion.div>
            ) : exportSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center text-green-600"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                เสร็จสิ้น
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                <IconComponent className="h-4 w-4 mr-2" />
                ส่งออก
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      )}
    </div>
  )
} 