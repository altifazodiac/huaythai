"use client"

import { motion } from "framer-motion"

interface HeaderProps {
  totalTickets: number
  counter: string
}

const Header = ({ totalTickets, counter }: HeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-gray-200 p-4 flex justify-between items-center"
    >
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-600">รายการทั้งหมด:</span>
        <span className="ml-2 text-sm font-bold text-blue-600">{totalTickets}</span>
      </div>
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-600">เวลาที่เหลือ:</span>
        <span className="ml-2 text-sm font-bold text-blue-600">{counter}</span>
      </div>
    </motion.div>
  )
}

export default Header
