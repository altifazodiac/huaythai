"use client"
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Maximize2, Minimize2, Info } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface DetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDownload?: boolean
  onDownload?: () => void
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl'
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8, 
    y: 50,
    rotateX: -15
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring" as const, // เพิ่ม as const
      stiffness: 300,
      damping: 24
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    y: 50,
    rotateX: 15,
    transition: {
      duration: 0.2
    }
  }
}

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.1,
      duration: 0.3
    }
  }
}

export default function DetailModal({ 
  open, 
  onClose, 
  title, 
  subtitle,
  children, 
  size = 'md',
  showDownload = true,
  onDownload
}: DetailModalProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  React.useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
        >
          {/* Backdrop with blur effect */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal Container */}
          <motion.div
            className={`relative w-full ${isFullscreen ? 'max-w-none h-screen' : sizeClasses[size]} m-4 ${isFullscreen ? 'm-0' : ''}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ perspective: 1000 }}
          >
            <Card className={`shadow-2xl border-0 ${isFullscreen ? 'h-full rounded-none' : 'rounded-xl'} overflow-hidden`}>
              {/* Header */}
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                      {subtitle && (
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {showDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDownload}
                        className="hover:bg-white/50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        ส่งออก
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="hover:bg-white/50"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="hover:bg-white/50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {/* Content */}
              <CardContent className={`${isFullscreen ? 'h-full overflow-auto' : 'max-h-[70vh] overflow-y-auto'} p-6`}>
                <motion.div
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  {children}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 