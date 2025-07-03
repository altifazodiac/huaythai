"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NumberPadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNumberClick: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  title?: string;
  currentValue?: string;
  placeholder?: string;
  selectedDigit?: number; // จำนวนหลักที่เลือก
}

const NumberPadDrawer: React.FC<NumberPadDrawerProps> = ({
  isOpen,
  onClose,
  onNumberClick,
  onBackspace,
  onClear,
  title = "กรอกข้อมูล",
  currentValue = "",
  placeholder = "กรอกหมายเลขที่นี่...",
  selectedDigit = 1
}) => {
  // จัดการ Layout ของปุ่มใหม่ทั้งหมดในที่เดียวเพื่อง่ายต่อการแก้ไข
  const keypadLayout = [
    { label: '1', value: '1', type: 'number' },
    { label: '2', value: '2', type: 'number' },
    { label: '3', value: '3', type: 'number' },
    { label: <Delete size={24} />, value: 'backspace', type: 'action', onClick: onBackspace, className: "row-span-2" },
    { label: '4', value: '4', type: 'number' },
    { label: '5', value: '5', type: 'number' },
    { label: '6', value: '6', type: 'number' },
    { label: '7', value: '7', type: 'number' },
    { label: '8', value: '8', type: 'number' },
    { label: '9', value: '9', type: 'number' },
    { label: <RotateCcw size={20} />, value: 'clear', type: 'action', onClick: onClear },
    { label: ',', value: ',', type: 'number' },
    { label: '0', value: '0', type: 'number' },
    { label: '␣', value: ' ', type: 'number' }, // Spacebar
    { label: '↵', value: '\n', type: 'action', onClick: () => onNumberClick('\n') }, // Newline
  ];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ฟังก์ชันจัดการการคีย์ตัวเลขพร้อมเว้นวรรคอัตโนมัติ
  const handleNumberClick = (value: string) => {
    if (value.match(/^\d$/)) { // ถ้าเป็นตัวเลข 0-9
      // หาตำแหน่งสุดท้ายที่ไม่ใช่เว้นวรรค, คอมม่า, หรือขึ้นบรรทัดใหม่
      const trimmedValue = currentValue.replace(/[\s,\n]+$/, ''); // ลบ separator ท้าย
      const lastGroup = trimmedValue.split(/[\s,\n]+/).pop() || ''; // กลุ่มตัวเลขสุดท้าย
      
      // ถ้ากลุ่มสุดท้ายมีความยาวครบตามจำนวนหลักที่เลือก ให้เพิ่มเว้นวรรคก่อน
      if (lastGroup.length >= selectedDigit) {
        onNumberClick(` ${value}`);
      } else {
        onNumberClick(value);
      }
    } else {
      // ถ้าไม่ใช่ตัวเลข (เช่น คอมม่า, เว้นวรรค, ขึ้นบรรทัดใหม่) ให้ใช้ตามปกติ
      onNumberClick(value);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - ลบ backdrop-blur-sm ออก */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={handleBackdropClick}
          />
          
          {/* Preview Textarea - แสดงด้านบน Drawer */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-80 left-4 right-4 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                ตัวอย่าง
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-500">
                {currentValue.length} ตัวอักษร
              </span>
            </div>
            <Textarea
              value={currentValue}
              placeholder={placeholder}
              readOnly
              rows={3}
              className="resize-none border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-lg font-mono"
            />
          </motion.div>
          
          {/* Drawer: ปรับดีไซน์ให้เรียบง่ายขึ้น */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-100 dark:bg-slate-900 rounded-t-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full"
              >
                <X size={22} />
              </Button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 grid-rows-4 gap-2.5 p-4 pb-safe">
              {keypadLayout.map((key) => {
                const isAction = key.type === 'action';
                const buttonBaseClasses = "h-full w-full rounded-xl text-3xl font-medium transition-colors duration-150 flex items-center justify-center";
                const numberClasses = "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600";
                const actionClasses = "bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 active:bg-slate-400 dark:active:bg-slate-500";
                
                return (
                    <motion.button
                        key={key.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (key.onClick) {
                                key.onClick();
                            } else if (key.type === 'number') {
                                handleNumberClick(key.value);
                            }
                        }}
                        className={`${buttonBaseClasses} ${isAction ? actionClasses : numberClasses} ${key.className || ''}`}
                    >
                        {key.label}
                    </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NumberPadDrawer;