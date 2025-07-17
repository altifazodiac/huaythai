"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import UniversalNumberCapAnalyzer from "@/components/lottery/UniversalNumberCapAnalyzer";

interface NumberCapAnalyzerDialogProps {
  lottery_sub_type_id: number;
  children: React.ReactNode;
}

export function NumberCapAnalyzerDialog({ lottery_sub_type_id, children }: NumberCapAnalyzerDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ระบบจัดการเลขอั้น</DialogTitle>
          <DialogDescription>
            วิเคราะห์ความเสี่ยงและแสดงเลขอั้นที่ควรหารครึ่งหรือปิดรับตามยอดขายจริง
          </DialogDescription>
        </DialogHeader>
        <UniversalNumberCapAnalyzer
          lottery_sub_type_id={lottery_sub_type_id}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default NumberCapAnalyzerDialog; 