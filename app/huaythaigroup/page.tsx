"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus } from "lucide-react";
import type { TicketSubType } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
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

const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const TicketSubTypeForm: React.FC = () => {
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newMultiplicationFactor, setNewMultiplicationFactor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editMultiplicationFactor, setEditMultiplicationFactor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch ticket sub-types on mount
  useEffect(() => {
    fetchTicketSubTypes();
  }, []);

  const fetchTicketSubTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ticket_sub_types")
        .select("*")
        .order("type_name", { ascending: true });

      if (error) throw error;
      setTicketSubTypes(data || []);
    } catch (err: any) {
      toast.error("ไม่สามารถโหลดประเภทตั๋วได้: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTypeName || !newMultiplicationFactor) {
      toast.error("กรุณากรอกชื่อประเภทและตัวคูณ");
      return;
    }

    const multiplicationFactor = Number(newMultiplicationFactor);
    if (isNaN(multiplicationFactor) || multiplicationFactor <= 0) {
      toast.error("ตัวคูณต้องเป็นตัวเลขที่มากกว่า 0");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("ticket_sub_types").insert({
        type_name: newTypeName,
        multiplication_factor: multiplicationFactor,
      });

      if (error) throw error;

      toast.success("เพิ่มประเภทตั๋วสำเร็จ");
      setNewTypeName("");
      setNewMultiplicationFactor("");
      await fetchTicketSubTypes();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการเพิ่ม: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTypeName || !editMultiplicationFactor) {
      toast.error("กรุณากรอกชื่อประเภทและตัวคูณ");
      return;
    }

    const multiplicationFactor = Number(editMultiplicationFactor);
    if (isNaN(multiplicationFactor) || multiplicationFactor <= 0) {
      toast.error("ตัวคูณต้องเป็นตัวเลขที่มากกว่า 0");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("ticket_sub_types")
        .update({
          type_name: editTypeName,
          multiplication_factor: multiplicationFactor,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("อัปเดตประเภทตั๋วสำเร็จ");
      setEditingId(null);
      await fetchTicketSubTypes();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดต: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("ticket_sub_types").delete().eq("id", id);

      if (error) throw error;

      toast.success("ลบประเภทตั๋วสำเร็จ");
      await fetchTicketSubTypes();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (subType: TicketSubType) => {
    setEditingId(subType.id);
    setEditTypeName(subType.type_name);
    setEditMultiplicationFactor(subType.multiplication_factor.toString());
  };

  return (
    <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                          <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          <BreadcrumbPage>ประเภทหวย</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                </header>
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      className="p-4 bg-gray-50"
    >
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <h2 className="text-lg font-semibold text-blue-800">จัดการประเภทตั๋ว</h2>
        </CardHeader>
        <CardContent>
          {/* Create Form */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <Label htmlFor="new-type-name" className="text-sm font-medium">
                ชื่อประเภท
              </Label>
              <Input
                id="new-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="เช่น สามตัวบน"
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="new-multiplication-factor" className="text-sm font-medium">
                ตัวคูณ
              </Label>
              <Input
                id="new-multiplication-factor"
                type="number"
                value={newMultiplicationFactor}
                onChange={(e) => setNewMultiplicationFactor(e.target.value)}
                placeholder="เช่น 900"
                className="mt-1"
                min="0"
                step="0.1"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isLoading}
              className="self-end bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              เพิ่ม
            </Button>
          </div>

          {/* List of Ticket Sub-Types */}
          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">กำลังโหลด...</div>
            ) : ticketSubTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">ไม่มีประเภทตั๋ว</div>
            ) : (
              <div className="p-2">
                {ticketSubTypes.map((subType) => (
                  <div
                    key={subType.id}
                    className="flex items-center gap-3 p-2 border-b hover:bg-blue-50"
                  >
                    {editingId === subType.id ? (
                      <>
                        <Input
                          value={editTypeName}
                          onChange={(e) => setEditTypeName(e.target.value)}
                          placeholder="ชื่อประเภท"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={editMultiplicationFactor}
                          onChange={(e) => setEditMultiplicationFactor(e.target.value)}
                          placeholder="ตัวคูณ"
                          className="flex-1"
                          min="0"
                          step="0.1"
                        />
                        <Button
                          onClick={() => handleUpdate(subType.id)}
                          disabled={isLoading}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          บันทึก
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={isLoading}
                        >
                          ยกเลิก
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{subType.type_name}</span>
                        <span className="flex-1 text-sm">
                          {subType.multiplication_factor}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => startEditing(subType)}
                          disabled={isLoading}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(subType.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
    </SidebarInset>
    </SidebarProvider>
  );
};

export default TicketSubTypeForm;