"use client";
import React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
// import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { useRef } from "react";

interface LotteryType {
  lottery_type_id: number;
  type_name: string;
}

interface LotterySubType {
  lottery_sub_type_id: number;
  lottery_type_id: number;
  sub_type_name: string;
  country_origin: string;
  reference_source: string;
  notes: string;
  is_active: boolean;
}

interface DrawingSchedule {
  schedule_id: number;
  lottery_sub_type_id: number;
  frequency_unit: string;
  frequency_value: number;
  drawing_time: string;
  day_of_week: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  open_time: string;
  close_time: string;
}

interface AnimalNumber {
  animal_number_id: number;
  number_code: string;
  animal_name: string;
  lottery_sub_type_id: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface LotterySubNumber {
  id: number;
  lottery_sub_type_id: number;
  digit_number: number;
  type_number: string;
  price_paid: number;
  created_at?: string;
  updated_at?: string;
}

const COLUMN_CONFIG = [
  { key: "index", label: "ลำดับ" },
  { key: "lottery_type_id", label: "ประเภทหวย" },
  { key: "sub_type_name", label: "ชื่อชนิดย่อย" },
  { key: "country_origin", label: "ประเทศ" },
  { key: "reference_source", label: "อ้างอิง" },
  { key: "notes", label: "หมายเหตุ" },
  { key: "is_active", label: "สถานะ" },
  { key: "actions", label: "จัดการ" },
];

export default function LotterySubTypePage() {
  // ลบโค้ดส่วนที่สร้าง client ใหม่ทิ้งไป
  /*
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (typeof window === "undefined") {
      // On server, don't create client
      return <div>Supabase config missing</div>;
    }
    throw new Error("Supabase config missing");
  }
  const supabase = React.useMemo(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []
  );
  */

  const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
  const [subTypes, setSubTypes] = useState<LotterySubType[]>([]);
  const [form, setForm] = useState<Partial<LotterySubType>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState<DrawingSchedule[]>([]);
  const [animalNumbers, setAnimalNumbers] = useState<AnimalNumber[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [currentSubTypeId, setCurrentSubTypeId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Partial<DrawingSchedule>>({});
  const [editScheduleId, setEditScheduleId] = useState<number | null>(null);
  const [animalDialogOpen, setAnimalDialogOpen] = useState(false);
  const [animalForm, setAnimalForm] = useState<Partial<AnimalNumber>>({});
  const [editAnimalId, setEditAnimalId] = useState<number | null>(null);
  const [animalSearch, setAnimalSearch] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof LotterySubType | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [payoutDrawerOpen, setPayoutDrawerOpen] = useState(false);
  const [payouts, setPayouts] = useState<LotterySubNumber[]>([]);
  const [payoutForm, setPayoutForm] = useState<Partial<LotterySubNumber>>({});
  const [editPayoutId, setEditPayoutId] = useState<number | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSubTypeId, setPayoutSubTypeId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [colWidths, setColWidths] = useState<number[]>([60, 120, 160, 120, 120, 120, 100, 180]);
  const tableRef = useRef<HTMLTableElement>(null);
  // Debounced search
  const [searchTerm, setSearchTerm] = useState("");
  // เพิ่มตรงนี้
  const [showColumns, setShowColumns] = useState<Record<string, boolean>>({
    index: true,
    lottery_type_id: true,
    sub_type_name: true,
    country_origin: true,
    reference_source: true,
    notes: true,
    is_active: true,
    actions: true,
  });

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // โหลด lottery_types สำหรับ select
  useEffect(() => {
    supabase.from("lottery_types").select().then(({ data }) => {
      if (data) setLotteryTypes(data);
    });
    fetchSubTypes();
  }, []);

  // โหลดข้อมูล sub_types ทั้งหมด
  async function fetchSubTypes() {
    const { data } = await supabase
      .from("lottery_sub_types")
      .select("*")
      .order("lottery_sub_type_id", { ascending: true });
    if (data) {
      // ตั้งค่า default is_active = true หากไม่มีข้อมูล
      const processedData = data.map(item => ({
        ...item,
        is_active: item.is_active ?? true
      }));
      setSubTypes(processedData);
    }
  }

  const handleResize = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[index];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + moveEvent.clientX - startX);
      setColWidths((widths) => {
        const updated = [...widths];
        updated[index] = newWidth;
        return updated;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [colWidths]);

  // Memoize handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEdit = useCallback((subType: LotterySubType) => {
    setForm(subType);
    setEditId(subType.lottery_sub_type_id);
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lottery_type_id || !form.sub_type_name) return;
    
    setLoading(true);
    
    try {
      const formData = {
      ...form,
        lottery_type_id: Number(form.lottery_type_id),
        is_active: form.is_active ?? true
    };
      
    if (editId) {
        const { error } = await supabase
          .from("lottery_sub_types")
          .update(formData)
          .eq("lottery_sub_type_id", editId);
        
        if (error) {
          toast.error("เกิดข้อผิดพลาด: " + error.message);
          return;
        }
        toast.success("อัปเดตสำเร็จ");
    } else {
        const { error } = await supabase
          .from("lottery_sub_types")
          .insert([formData]);
        
      if (error) {
          toast.error("เกิดข้อผิดพลาด: " + error.message);
        return;
      }
        toast.success("เพิ่มสำเร็จ");
    }
      
    setForm({});
    setEditId(null);
      setOpen(false);
    await fetchSubTypes();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
    setLoading(false);
    }
  }, [form, editId, supabase]);

  // handle delete
  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบ?")) return;
    await supabase.from("lottery_sub_types").delete().eq("lottery_sub_type_id", id);
    toast.success("ลบสำเร็จ");
    await fetchSubTypes();
  }

  // handle toggle active
  async function handleToggleActive(id: number, currentStatus: boolean) {
    console.log(`Toggling active for sub_type_id: ${id} from ${currentStatus} to ${!currentStatus}`);
    try {
      const { data, error } = await supabase
        .from("lottery_sub_types")
        .update({ is_active: !currentStatus })
        .eq("lottery_sub_type_id", id)
        .select(); // ใช้ .select() เพื่อให้ได้ข้อมูลกลับมา
      
      if (error) {
        console.error("Toggle Active Error:", error);
        toast.error("เกิดข้อผิดพลาด: " + error.message);
        return;
      }
      
      console.log("Toggle successful:", data);
      toast.success(currentStatus ? "ปิดใช้งานสำเร็จ" : "เปิดใช้งานสำเร็จ");
      await fetchSubTypes();
    } catch (error) {
      console.error("Unexpected Toggle Error:", error);
      toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิดในการอัปเดต");
    }
  }

  // ดึง schedules ของ sub_type
  const fetchSchedules = async (lottery_sub_type_id: number) => {
    const { data } = await supabase
      .from("drawing_schedules")
      .select("*")
      .eq("lottery_sub_type_id", lottery_sub_type_id);
    setSchedules(data || []);
  };

  // ดึง animal numbers ของ sub_type
  const fetchAnimalNumbers = async (lottery_sub_type_id: number) => {
    const { data } = await supabase
      .from("animal_numbers")
      .select("*")
      .eq("lottery_sub_type_id", lottery_sub_type_id);
    setAnimalNumbers(data || []);
  };

  // ตารางเวลา Dialog
  const openScheduleDialog = async (lottery_sub_type_id: number) => {
    setCurrentSubTypeId(lottery_sub_type_id);
    setScheduleDialogOpen(true);
    await fetchSchedules(lottery_sub_type_id);
    setScheduleForm({ is_active: true }); // ตั้งค่า default is_active เป็น true
    setEditScheduleId(null);
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setScheduleForm({ ...scheduleForm, [e.target.name]: e.target.value });
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubTypeId) return;
    
    // เตรียมข้อมูลให้ถูกต้อง
    const formData = {
      ...scheduleForm,
      lottery_sub_type_id: currentSubTypeId,
      frequency_value: Number(scheduleForm.frequency_value),
      is_active: scheduleForm.is_active ?? true
    };
    
    console.log("Submitting schedule form:", { editScheduleId, formData });

    try {
      if (editScheduleId) {
        const { data, error } = await supabase
          .from("drawing_schedules")
          .update(formData)
          .eq("schedule_id", editScheduleId)
          .select();
        
        if (error) {
          console.error("Update Schedule Error:", error);
          toast.error("เกิดข้อผิดพลาดในการแก้ไข: " + error.message);
          return;
        }
        console.log("Update Schedule Success:", data);
        toast.success("แก้ไขตารางเวลาสำเร็จ");
      } else {
        const { data, error } = await supabase
          .from("drawing_schedules")
          .insert([formData])
          .select();
        
        if (error) {
          console.error("Insert Schedule Error:", error);
          toast.error("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
          return;
        }
        console.log("Insert Schedule Success:", data);
        toast.success("บันทึกตารางเวลาสำเร็จ");
      }
      
      await fetchSchedules(currentSubTypeId);
      setScheduleForm({ is_active: true });
      setEditScheduleId(null);
    } catch (error) {
      console.error("Unexpected Schedule Submit Error:", error);
      toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
  };

  const handleEditSchedule = (schedule: DrawingSchedule) => {
    setScheduleForm(schedule);
    setEditScheduleId(schedule.schedule_id);
  };

  const handleDeleteSchedule = async (schedule_id: number) => {
    if (!currentSubTypeId) return;
    if (!confirm("ยืนยันการลบตารางเวลานี้?")) return;

    try {
      // 1. ลบ scheduled_tasks ที่อ้างอิง schedule_id นี้ก่อน
      const { error: taskError } = await supabase
        .from("scheduled_tasks")
        .delete()
        .eq("schedule_id", schedule_id);

      if (taskError) {
        toast.error("เกิดข้อผิดพลาดในการลบงานที่เกี่ยวข้อง: " + taskError.message);
        return;
      }

      // 2. ลบ schedule จริง
      const { error } = await supabase
        .from("drawing_schedules")
        .delete()
        .eq("schedule_id", schedule_id);

      if (error) {
        toast.error("เกิดข้อผิดพลาดในการลบตารางเวลา: " + error.message);
        return;
      }

      toast.success("ลบตารางเวลาสำเร็จ");
      await fetchSchedules(currentSubTypeId);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิดในการลบ");
    }
  };

  // Animal Numbers Dialog
  const openAnimalDialog = async (lottery_sub_type_id: number) => {
    setCurrentSubTypeId(lottery_sub_type_id);
    setAnimalDialogOpen(true);
    await fetchAnimalNumbers(lottery_sub_type_id);
    setAnimalForm({});
    setEditAnimalId(null);
  };

  const handleAnimalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAnimalForm({ ...animalForm, [e.target.name]: e.target.value });
  };

  const handleAnimalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubTypeId) return;
    const formData = { ...animalForm, lottery_sub_type_id: currentSubTypeId };
    if (editAnimalId) {
      await supabase.from("animal_numbers").update(formData).eq("animal_number_id", editAnimalId);
      toast.success("แก้ไขเลขสัตว์สำเร็จ");
    } else {
      await supabase.from("animal_numbers").insert([formData]);
      toast.success("บันทึกเลขสัตว์สำเร็จ");
    }
    await fetchAnimalNumbers(currentSubTypeId);
    setAnimalForm({});
    setEditAnimalId(null);
  };

  const handleEditAnimal = (animal: AnimalNumber) => {
    setAnimalForm(animal);
    setEditAnimalId(animal.animal_number_id);
  };

  const handleDeleteAnimal = async (animal_number_id: number) => {
    if (!currentSubTypeId) return;
    if (!confirm("ยืนยันการลบเลขสัตว์นี้?")) return;
    await supabase.from("animal_numbers").delete().eq("animal_number_id", animal_number_id);
    toast.success("ลบเลขสัตว์สำเร็จ");
    await fetchAnimalNumbers(currentSubTypeId);
  };

  // ฟังก์ชัน filter และ sort
  const filteredSubTypes = useMemo(() => {
    return subTypes
    .filter((item) => {
      const q = search.toLowerCase();
        const statusMatch = statusFilter === "all" || 
          (statusFilter === "active" && item.is_active) || 
          (statusFilter === "inactive" && !item.is_active);
        
        const textMatch = item.sub_type_name?.toLowerCase().includes(q) ||
        item.country_origin?.toLowerCase().includes(q) ||
        item.reference_source?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
          lotteryTypes.find((t) => t.lottery_type_id === item.lottery_type_id)?.type_name?.toLowerCase().includes(q);
        
        return statusMatch && textMatch;
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      let aValue = a[sortKey];
      let bValue = b[sortKey];
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();
        if (aValue < bValue) return sortAsc ? -1 : 1;
        if (aValue > bValue) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [subTypes, search, statusFilter, sortKey, sortAsc, lotteryTypes]);

  // --- LotterySubNumber CRUD ---
  const fetchPayouts = async (lottery_sub_type_id: number) => {
    setPayoutLoading(true);
    const { data } = await supabase
      .from("lottery_sub_number")
      .select("*")
      .eq("lottery_sub_type_id", lottery_sub_type_id)
      .order("digit_number", { ascending: false })
      .order("type_number", { ascending: true });
    setPayouts(data || []);
    setPayoutLoading(false);
  };

  const openPayoutDrawer = async (lottery_sub_type_id: number) => {
    setPayoutSubTypeId(lottery_sub_type_id);
    setPayoutDrawerOpen(true);
    setPayoutForm({});
    setEditPayoutId(null);
    await fetchPayouts(lottery_sub_type_id);
  };

  const handlePayoutChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPayoutForm({ ...payoutForm, [e.target.name]: e.target.value });
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutSubTypeId) return;

    if (!payoutForm.digit_number || !payoutForm.type_number || !payoutForm.price_paid) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setPayoutLoading(true);

    if (editPayoutId) {
      // For UPDATE operation
      const { error } = await supabase
        .from("lottery_sub_number")
        .update({
          digit_number: Number(payoutForm.digit_number),
          type_number: payoutForm.type_number,
          price_paid: Number(payoutForm.price_paid),
        })
        .eq("id", editPayoutId);

      if (error) {
        toast.error(error.message || "เกิดข้อผิดพลาดในการอัปเดต");
      } else {
        toast.success("แก้ไขอัตราจ่ายสำเร็จ");
      }
    } else {
      // For INSERT operation
      const { error } = await supabase.from("lottery_sub_number").insert([
        {
          lottery_sub_type_id: payoutSubTypeId,
          digit_number: Number(payoutForm.digit_number),
          type_number: payoutForm.type_number,
          price_paid: Number(payoutForm.price_paid),
        },
      ]);
      if (error) {
        toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
      } else {
        toast.success("บันทึกอัตราจ่ายสำเร็จ");
      }
    }
    
    setPayoutLoading(false);
    setPayoutForm({});
    setEditPayoutId(null);
    await fetchPayouts(payoutSubTypeId);
  };

  const handleEditPayout = (payout: LotterySubNumber) => {
    setPayoutForm({ ...payout });
    setEditPayoutId(payout.id);
  };

  const handleDeletePayout = async (id: number) => {
    if (!payoutSubTypeId) return;
    if (!confirm("ยืนยันการลบอัตราจ่ายนี้?")) return;
    await supabase.from("lottery_sub_number").delete().eq("id", id);
    toast.success("ลบอัตราจ่ายสำเร็จ");
    await fetchPayouts(payoutSubTypeId);
  };

  // Memoized TableRow Component
  const TableRowComponent = React.memo(({ item, index, colWidths, lotteryTypes, handleEdit, handleDelete, handleToggleActive, openScheduleDialog, openAnimalDialog, openPayoutDrawer, expandedRow, setExpandedRow }: {
    item: LotterySubType;
    index: number;
    colWidths: number[];
    lotteryTypes: LotteryType[];
    handleEdit: (item: LotterySubType) => void;
    handleDelete: (id: number) => void;
    handleToggleActive: (id: number, status: boolean) => void;
    openScheduleDialog: (id: number) => void;
    openAnimalDialog: (id: number) => void;
    openPayoutDrawer: (id: number) => void;
    expandedRow: number | null;
    setExpandedRow: (id: number | null) => void;
  }) => (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TableCell style={{ width: colWidths[0], minWidth: 60 }}>
        <button
          className="mr-2 text-lg focus:outline-none"
          onClick={() => setExpandedRow(expandedRow === item.lottery_sub_type_id ? null : item.lottery_sub_type_id)}
          title="แสดง/ซ่อนตารางเวลา"
          type="button"
        >
          {expandedRow === item.lottery_sub_type_id ? "▼" : "▶"}
        </button>
        {index + 1}
      </TableCell>
      <TableCell style={{ width: colWidths[1], minWidth: 60 }}>
        {lotteryTypes.find((t) => t.lottery_type_id === item.lottery_type_id)?.type_name || "-"}
      </TableCell>
      <TableCell style={{ width: colWidths[2], minWidth: 60 }}>{item.sub_type_name}</TableCell>
      <TableCell style={{ width: colWidths[3], minWidth: 60 }}>{item.country_origin}</TableCell>
      <TableCell style={{ width: colWidths[4], minWidth: 60 }}>{item.reference_source}</TableCell>
      <TableCell style={{ width: colWidths[5], minWidth: 60 }}>{item.notes}</TableCell>
      <TableCell style={{ width: colWidths[6], minWidth: 60 }}>
        <div className="flex items-center gap-2">
          <Switch
            checked={item.is_active}
            onCheckedChange={() => handleToggleActive(item.lottery_sub_type_id, item.is_active)}
            className="data-[state=checked]:bg-green-500"
          />
          <span className={`text-xs ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}>
            {item.is_active ? 'เปิด' : 'ปิด'}
          </span>
        </div>
      </TableCell>
      <TableCell style={{ width: colWidths[7], minWidth: 60 }}>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
            แก้ไข
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDelete(item.lottery_sub_type_id)}>
            ลบ
          </Button>
          <Button size="sm" variant="outline" onClick={() => openScheduleDialog(item.lottery_sub_type_id)}>
            ตารางเวลา
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAnimalDialog(item.lottery_sub_type_id)}>
            สัตว์
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPayoutDrawer(item.lottery_sub_type_id)}>
            อัตรา
          </Button>
        </div>
      </TableCell>
    </motion.tr>
  ));

  TableRowComponent.displayName = 'TableRowComponent';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mx-auto p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">จัดการชนิดย่อยของหวย (Lottery Sub Types)</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มชนิดย่อย
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editId ? "แก้ไขชนิดย่อยของหวย" : "เพิ่มชนิดย่อยของหวย"}</DialogTitle>
                <DialogDescription>
                  {editId ? "แก้ไขข้อมูลชนิดย่อยของหวยที่เลือก" : "เพิ่มชนิดย่อยของหวยใหม่"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ประเภทหวย</label>
                  <Select
                    name="lottery_type_id"
                    value={form.lottery_type_id?.toString()}
                    onValueChange={(value) => setForm({ ...form, lottery_type_id: parseInt(value) })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotteryTypes.map((type) => (
                        <SelectItem key={type.lottery_type_id} value={type.lottery_type_id.toString()}>
                          {type.type_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ชื่อชนิดย่อย</label>
                  <Input
                    name="sub_type_name"
                    value={form.sub_type_name || ""}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ประเทศต้นทาง</label>
                  <Input
                    name="country_origin"
                    value={form.country_origin || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">แหล่งอ้างอิง</label>
                  <Input
                    name="reference_source"
                    value={form.reference_source || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">หมายเหตุ</label>
                  <Textarea
                    name="notes"
                    value={form.notes || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">เปิดใช้งาน</label>
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editId ? "อัปเดต" : "เพิ่ม"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm({});
                      setEditId(null);
                      setOpen(false);
                    }}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 flex gap-2 items-center">
          <Input
            placeholder="ค้นหาชื่อ, ประเทศ, อ้างอิง, หมายเหตุ หรือประเภทหวย"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="กรองตามสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="active">เปิดใช้งาน</SelectItem>
              <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* UI สำหรับเลือกซ่อน/แสดง column */}
        <div className="mb-2 flex gap-2 items-center">
          <span className="text-sm font-medium">แสดงคอลัมน์:</span>
          {COLUMN_CONFIG.filter(col => col.key !== "is_active" && col.key !== "actions").map(col => (
            <label key={col.key} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showColumns[col.key]}
                onChange={() => setShowColumns((sc: Record<string, boolean>) => ({ ...sc, [col.key]: !sc[col.key] }))}
              />
              {col.label}
            </label>
          ))}
          <span className="text-xs text-gray-400">(สถานะ, จัดการ แสดงเสมอ)</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการชนิดย่อยของหวย</CardTitle>
          </CardHeader>
          <CardContent>
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  {COLUMN_CONFIG.map((col, idx) =>
                    showColumns[col.key] && (
                      <TableHead
                        key={col.key}
                        style={{ width: colWidths[idx], minWidth: 60, position: "relative" }}
                        onClick={
                          col.key === "index" ? () => { setSortKey("lottery_sub_type_id"); setSortAsc(sortKey !== "lottery_sub_type_id" ? true : !sortAsc); } :
                          col.key === "lottery_type_id" ? () => { setSortKey("lottery_type_id"); setSortAsc(sortKey !== "lottery_type_id" ? true : !sortAsc); } :
                          col.key === "sub_type_name" ? () => { setSortKey("sub_type_name"); setSortAsc(sortKey !== "sub_type_name" ? true : !sortAsc); } :
                          col.key === "country_origin" ? () => { setSortKey("country_origin"); setSortAsc(sortKey !== "country_origin" ? true : !sortAsc); } :
                          col.key === "reference_source" ? () => { setSortKey("reference_source"); setSortAsc(sortKey !== "reference_source" ? true : !sortAsc); } :
                          col.key === "notes" ? () => { setSortKey("notes"); setSortAsc(sortKey !== "notes" ? true : !sortAsc); } :
                          col.key === "is_active" ? () => { setSortKey("is_active"); setSortAsc(sortKey !== "is_active" ? true : !sortAsc); } : undefined
                        }
                        className={"cursor-pointer group"}
                      >
                        {col.label}
                        {/* Resizer */}
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            height: "100%",
                            width: 6,
                            cursor: "col-resize",
                            zIndex: 10,
                            userSelect: "none"
                          }}
                          onMouseDown={(e) => handleResize(idx, e)}
                        />
                        {/* Sort indicator */}
                        {col.key === "index" && sortKey === "lottery_sub_type_id" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "lottery_type_id" && sortKey === "lottery_type_id" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "sub_type_name" && sortKey === "sub_type_name" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "country_origin" && sortKey === "country_origin" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "reference_source" && sortKey === "reference_source" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "notes" && sortKey === "notes" && (sortAsc ? " ▲" : " ▼")}
                        {col.key === "is_active" && sortKey === "is_active" && (sortAsc ? " ▲" : " ▼")}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredSubTypes.map((item, index) => (
                    <React.Fragment key={item.lottery_sub_type_id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {showColumns.index && (
                          <TableCell style={{ width: colWidths[0], minWidth: 60 }}>
                          <button
                            className="mr-2 text-lg focus:outline-none"
                            onClick={() => setExpandedRow(expandedRow === item.lottery_sub_type_id ? null : item.lottery_sub_type_id)}
                            title="แสดง/ซ่อนตารางเวลา"
                            type="button"
                          >
                            {expandedRow === item.lottery_sub_type_id ? "▼" : "▶"}
                          </button>
                            {index + 1}
                        </TableCell>
                        )}
                        {showColumns.lottery_type_id && (
                          <TableCell style={{ width: colWidths[1], minWidth: 60 }}>
                          {lotteryTypes.find((t) => t.lottery_type_id === item.lottery_type_id)?.type_name || "-"}
                        </TableCell>
                        )}
                        {showColumns.sub_type_name && (
                          <TableCell style={{ width: colWidths[2], minWidth: 60 }}>{item.sub_type_name}</TableCell>
                        )}
                        {showColumns.country_origin && (
                          <TableCell style={{ width: colWidths[3], minWidth: 60 }}>{item.country_origin}</TableCell>
                        )}
                        {showColumns.reference_source && (
                          <TableCell style={{ width: colWidths[4], minWidth: 60 }}>{item.reference_source}</TableCell>
                        )}
                        {showColumns.notes && (
                          <TableCell style={{ width: colWidths[5], minWidth: 60 }}>{item.notes}</TableCell>
                        )}
                        {showColumns.is_active && (
                          <TableCell style={{ width: colWidths[6], minWidth: 60 }}>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => handleToggleActive(item.lottery_sub_type_id, item.is_active)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <span className={`text-xs ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                {item.is_active ? 'เปิด' : 'ปิด'}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {showColumns.actions && (
                          <TableCell style={{ width: colWidths[7], minWidth: 60 }}>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              แก้ไข
                            </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(item.lottery_sub_type_id)}>
                              ลบ
                            </Button>
                              <Button size="sm" variant="outline" onClick={() => openScheduleDialog(item.lottery_sub_type_id)}>
                                ตารางเวลา
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAnimalDialog(item.lottery_sub_type_id)}>
                                สัตว์
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openPayoutDrawer(item.lottery_sub_type_id)}>
                                อัตรา
                              </Button>
                          </div>
                        </TableCell>
                        )}
                      </motion.tr>
                      {expandedRow === item.lottery_sub_type_id && showColumns.index && (
                        <tr>
                          <td colSpan={Object.values(showColumns).filter(Boolean).length} className="bg-zinc-50 dark:bg-zinc-800 p-4">
                            <DrawingScheduleCollapse lottery_sub_type_id={item.lottery_sub_type_id} supabase={supabase} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
      
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>ตารางเวลาสำหรับ {subTypes.find(s => s.lottery_sub_type_id === currentSubTypeId)?.sub_type_name}</DialogTitle>
            <DialogDescription>
              จัดการตารางเวลาการเปิดปิดรับสำหรับชนิดย่อยของหวยที่เลือก
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">หน่วยความถี่</label>
                <select
                  name="frequency_unit"
                  value={scheduleForm.frequency_unit || ""}
                  onChange={handleScheduleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">เลือก</option>
                  <option value="day">วัน</option>
                  <option value="week">สัปดาห์</option>
                  <option value="month">เดือน</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">ค่าความถี่</label>
                <input
                  type="number"
                  name="frequency_value"
                  value={scheduleForm.frequency_value || ""}
                  onChange={handleScheduleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">เวลาออก</label>
                <input
                  type="time"
                  name="drawing_time"
                  value={scheduleForm.drawing_time || ""}
                  onChange={handleScheduleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">วันในสัปดาห์</label>
                <input
                  type="text"
                  name="day_of_week"
                  value={scheduleForm.day_of_week || ""}
                  onChange={handleScheduleChange}
                  className="w-full border rounded px-2 py-1"
                  placeholder="เช่น Monday, Tuesday"
                />
              </div>
              <div>
                <label className="text-sm font-medium">เวลาเปิดรับ</label>
                <input
                  type="time"
                  name="open_time"
                  value={scheduleForm.open_time || ""}
                  onChange={handleScheduleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">เวลาปิดรับ</label>
                <input
                  type="time"
                  name="close_time"
                  value={scheduleForm.close_time || ""}
                  onChange={handleScheduleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">เปิดใช้งาน</label>
                <select
                  name="is_active"
                  value={scheduleForm.is_active !== undefined ? (scheduleForm.is_active ? "true" : "false") : "true"}
                  onChange={e => setScheduleForm({ ...scheduleForm, is_active: e.target.value === "true" })}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="true">ใช่</option>
                  <option value="false">ไม่ใช่</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit">{editScheduleId ? "อัปเดต" : "เพิ่ม"}</Button>
              <Button type="button" variant="outline" onClick={() => { setScheduleForm({ is_active: true }); setEditScheduleId(null); }}>ยกเลิก</Button>
            </div>
          </form>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">รายการตารางเวลา</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>ค่า</TableHead>
                  <TableHead>เวลา</TableHead>
                  <TableHead>วัน</TableHead>
                  <TableHead>เปิดใช้งาน</TableHead>
                  <TableHead>จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((sch) => (
                  <TableRow key={sch.schedule_id}>
                    <TableCell>{sch.frequency_unit}</TableCell>
                    <TableCell>{sch.frequency_value}</TableCell>
                    <TableCell>{sch.drawing_time}</TableCell>
                    <TableCell>{sch.day_of_week}</TableCell>
                    <TableCell>{sch.is_active ? "ใช่" : "ไม่ใช่"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleEditSchedule(sch)}>แก้ไข</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteSchedule(sch.schedule_id)}>ลบ</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
     
      <Drawer open={animalDialogOpen} onOpenChange={setAnimalDialogOpen}>
        <DrawerContent className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-lg z-50 flex flex-col p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DrawerTitle className="text-lg font-bold">จัดการเลขสัตว์ (Animal Numbers)</DrawerTitle>
            <Button variant="ghost" size="icon" onClick={() => setAnimalDialogOpen(false)} aria-label="ปิด">
              <span aria-hidden>×</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form onSubmit={handleAnimalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">รหัสเลข</label>
                  <Input
                    name="number_code"
                    value={animalForm.number_code || ""}
                    onChange={handleAnimalChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ชื่อสัตว์</label>
                  <Input
                    name="animal_name"
                    value={animalForm.animal_name || ""}
                    onChange={handleAnimalChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">หมายเหตุ</label>
                  <Textarea
                    name="notes"
                    value={animalForm.notes || ""}
                    onChange={handleAnimalChange}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="submit">{editAnimalId ? "อัปเดต" : "เพิ่ม"}</Button>
                <Button type="button" variant="outline" onClick={() => { setAnimalForm({}); setEditAnimalId(null); }}>ยกเลิก</Button>
              </div>
            </form>
            <div className="mt-6">
              <h4 className="font-semibold mb-2">รายการเลขสัตว์</h4>
              <Input
                placeholder="ค้นหาชื่อสัตว์หรือรหัสเลข"
                value={animalSearch}
                onChange={e => setAnimalSearch(e.target.value)}
                className="mb-2"
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสเลข</TableHead>
                      <TableHead>ชื่อสัตว์</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animalNumbers
                      .filter(animal =>
                        animal.animal_name?.includes(animalSearch) ||
                        animal.number_code?.includes(animalSearch)
                      )
                      .sort((a, b) => a.number_code.localeCompare(b.number_code))
                      .map((animal) => (
                        <TableRow key={animal.animal_number_id}>
                          <TableCell>{animal.number_code}</TableCell>
                          <TableCell>{animal.animal_name}</TableCell>
                          <TableCell>{animal.notes}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleEditAnimal(animal)}>แก้ไข</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAnimal(animal.animal_number_id)}>ลบ</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
     
      <Drawer open={payoutDrawerOpen} onOpenChange={setPayoutDrawerOpen}>
        <DrawerContent className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col p-0 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-8 py-6 border-b bg-zinc-50 dark:bg-zinc-900">
            <DrawerTitle className="text-xl font-bold text-blue-700">จัดการอัตราจ่าย (Payout)</DrawerTitle>
            <Button variant="ghost" size="icon" onClick={() => { setPayoutDrawerOpen(false); setPayoutForm({}); setEditPayoutId(null); }} aria-label="ปิด">
              <span aria-hidden>X</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <form onSubmit={handlePayoutSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">จำนวนหลัก
                    <span className="ml-1 text-xs text-muted-foreground">(2, 3{payoutSubTypeId && [3,13,15,16,17,18,19,20,21,22,23,25].includes(payoutSubTypeId) ? ', 4' : ''})</span>
                  </label>
                  <select
                    name="digit_number"
                    className="w-full border rounded px-2 py-2 mt-1"
                    value={payoutForm.digit_number || ''}
                    onChange={handlePayoutChange}
                    required
                  >
                    <option value="">เลือกจำนวนหลัก</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    {payoutSubTypeId && [3,13,15,16,17,18,19,20,21,22,23,25].includes(payoutSubTypeId) && (
                      <option value="4">4</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">ประเภท</label>
                  <Input
                    name="type_number"
                    placeholder="เช่น บน, ล่าง, โต๊ด,วิ่งบน,วิ่งล่าง"
                    value={payoutForm.type_number || ""}
                    onChange={handlePayoutChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ราคาจ่าย</label>
                  <Input
                    name="price_paid"
                    type="number"
                    placeholder="เช่น 900"
                    value={payoutForm.price_paid || ""}
                    onChange={handlePayoutChange}
                    required
                    min={1}
                  />
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-2">
                <Button type="submit" disabled={payoutLoading} className="px-8 py-2 text-base">
                  {editPayoutId ? "อัปเดต" : "เพิ่ม"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-8 py-2 text-base border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => { setPayoutForm({}); setEditPayoutId(null); }}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
            <hr className="my-6 border-zinc-200 dark:border-zinc-700" />
            <div className="mt-2">
              <h4 className="font-semibold mb-4 text-lg text-blue-700">รายการอัตราจ่าย</h4>
              {payoutLoading ? (
                <div className="py-4 text-center">กำลังโหลด...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>จำนวนหลัก</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead>ราคาจ่าย</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id} className={editPayoutId === payout.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                          <TableCell>{payout.digit_number}</TableCell>
                          <TableCell>{payout.type_number}</TableCell>
                          <TableCell>{payout.price_paid}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleEditPayout(payout)} className="mr-2">แก้ไข</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePayout(payout.id)}>ลบ</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// --- DrawingScheduleCollapse ---
function DrawingScheduleCollapse({ lottery_sub_type_id, supabase }: { lottery_sub_type_id: number; supabase: SupabaseClient<any, string, any> }) {
  const [schedules, setSchedules] = useState<DrawingSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    supabase
      .from("drawing_schedules")
      .select("*")
      .eq("lottery_sub_type_id", lottery_sub_type_id)
      .then((res) => {
        if (!ignore) setSchedules((res.data as DrawingSchedule[]) || []);
        setLoading(false);
      });
    return () => { ignore = true; };
  }, [lottery_sub_type_id, supabase]);

  if (loading) return <div className="py-4 text-center">กำลังโหลด...</div>;
  if (!schedules.length) return <div className="py-4 text-center text-muted-foreground">ไม่มีตารางเวลา</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>หน่วย</TableHead>
          <TableHead>ค่า</TableHead>
          <TableHead>เวลาออก</TableHead>
          <TableHead>วัน</TableHead>
          <TableHead>เปิดรับ</TableHead>
          <TableHead>ปิดรับ</TableHead>
          <TableHead>เปิดใช้งาน</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((sch) => (
          <TableRow key={sch.schedule_id}>
            <TableCell>{sch.frequency_unit}</TableCell>
            <TableCell>{sch.frequency_value}</TableCell>
            <TableCell>{sch.drawing_time}</TableCell>
            <TableCell>{sch.day_of_week}</TableCell>
            <TableCell>{sch.open_time}</TableCell>
            <TableCell>{sch.close_time}</TableCell>
            <TableCell>{sch.is_active ? "ใช่" : "ไม่ใช่"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 