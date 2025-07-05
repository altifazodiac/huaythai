"use client"
import React from 'react'

interface DetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function DetailModal({ open, onClose, title, children }: DetailModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div>{children}</div>
      </div>
    </div>
  )
} 