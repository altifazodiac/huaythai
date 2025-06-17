"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import SpectacularLoader from "@/components/ui/SpectacularLoader";
import { ShoppingCart, RefreshCw, ArrowDownUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
const ICONS: Record<string, any> = {
  purchase: ShoppingCart,
  refund: RefreshCw,
  transfer: ArrowDownUp,
  bill: ShoppingCart,
  commission: ArrowDownUp,
};

function getIcon(type: string) {
  return ICONS[type] || HelpCircle;
}

function getTypeLabel(type: string) {
  switch (type) {
    case "purchase": return "สั่งซื้อ";
    case "refund": return "คืนเงิน";
    case "transfer": return "โอน/รับโอน";
    case "bill": return "บิล";
    case "commission": return "คอมมิชัน";
    default: return type;
  }
}

export default function CreditTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, user_id, amount, transaction_type, created_at, description, related_bill_number, profiles: user_id (name, email)")
        .not("transaction_type", "eq", "topup")
        .order("created_at", { ascending: false });
      setTransactions(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = transactions.filter((item) => {
    const user = item.profiles;
    const s = search.toLowerCase();
    return (
      !search ||
      (user?.name && user.name.toLowerCase().includes(s)) ||
      (user?.email && user.email.toLowerCase().includes(s)) ||
      (item.amount && item.amount.toString().includes(s)) ||
      (item.transaction_type && getTypeLabel(item.transaction_type).includes(s)) ||
      (item.created_at && format(new Date(item.created_at), "dd/MM/yyyy HH:mm").includes(s)) ||
      (item.description && item.description.toLowerCase().includes(s))
    );
  });

  // Group transactions by date (YYYY-MM-DD)
  const groupedByDate = filtered.reduce((acc, item) => {
    const dateKey = format(new Date(item.created_at), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, any[]>);
  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <DirectionProvider dir="ltr">
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>ธุรกรรมการสั่งซื้อ</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-6 px-2 md:px-0 flex flex-col items-center ">
      <div className="w-full p-6">
        <h1 className="text-2xl font-bold mb-2 text-blue-900">ธุรกรรมเครดิต</h1>
        <p className="text-muted-foreground mb-4">รวมธุรกรรมการสั่งซื้อและเคลื่อนไหวของบัญชี</p>
        <Input
          placeholder="ค้นหาด้วยชื่อ, อีเมล, ประเภท, จำนวน, วันที่..."
          className="mb-4"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading ? (
          <SpectacularLoader message="กำลังโหลดธุรกรรม..." baseColor="indigo" />
        ) : (
          <div className="space-y-6 w-full">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="text-center text-muted-foreground py-12"
                >
                  ไม่พบข้อมูลธุรกรรม
                </motion.div>
              ) : (
                sortedDates.map((dateKey, groupIdx) => (
                  <motion.div
                    key={dateKey}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.35, delay: groupIdx * 0.05 }}
                    className="rounded-xl shadow border border-green-800/20 bg-white/90 overflow-x-auto w-full"
                  >
                    <div className="sticky top-0 z-10 bg-green-800 text-white px-4 py-2 rounded-t-xl flex items-center gap-2">
                      <span className="font-bold text-lg md:text-xl"><span className="hidden md:inline">วันที่</span> {format(new Date(dateKey), "d MMM yyyy", { locale: th })}</span>
                    </div>
                    <Table className="min-w-full text-xs md:text-sm">
                      <TableHeader>
                        <TableRow className="bg-green-100">
                          <TableHead className="w-12"></TableHead>
                          <TableHead>เวลา</TableHead>
                          <TableHead>ประเภท</TableHead>
                          <TableHead>ชื่อผู้ใช้</TableHead>
                          <TableHead>จำนวน</TableHead>
                          <TableHead>บิล</TableHead>
                          <TableHead>รายละเอียด</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedByDate[dateKey].map((item: any, idx: number) => {
                          const Icon = getIcon(item.transaction_type);
                          return (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 30 }}
                              transition={{ delay: idx * 0.03 }}
                              className="hover:bg-green-50 transition cursor-pointer"
                            >
                              <TableCell className="text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100"><Icon className="w-5 h-5 text-green-700" /></span></TableCell>
                              <TableCell>{format(new Date(item.created_at), "HH:mm")}</TableCell>
                              <TableCell>{getTypeLabel(item.transaction_type)}</TableCell>
                              <TableCell>{item.profiles?.name || "-"}</TableCell>
                              <TableCell className={item.amount > 0 ? "text-green-700 font-bold" : "text-red-500 font-bold"}>{item.amount > 0 ? "+" : ""}{Number(item.amount).toLocaleString()}</TableCell>
                              <TableCell>{item.related_bill_number || "-"}</TableCell>
                              <TableCell>
                                <Drawer open={openId === item.id} onOpenChange={open => setOpenId(open ? item.id : null)}>
                                  <DrawerTrigger asChild>
                                    <button className="underline text-green-700 hover:text-green-900">ดูรายละเอียด</button>
                                  </DrawerTrigger>
                                  <DrawerContent>
                                    <DrawerHeader>
                                      <DrawerTitle>รายละเอียดธุรกรรม</DrawerTitle>
                                      <DrawerDescription>ข้อมูลธุรกรรมเครดิตอย่างละเอียด</DrawerDescription>
                                    </DrawerHeader>
                                    <div className="px-4 pb-4 space-y-2">
                                      <div><b>รหัสธุรกรรม:</b> {item.id}</div>
                                      <div><b>ชื่อผู้ใช้:</b> {item.profiles?.name || "-"}</div>
                                      <div><b>ประเภท:</b> {getTypeLabel(item.transaction_type)}</div>
                                      <div><b>จำนวน:</b> <span className={item.amount > 0 ? "text-green-700" : "text-red-500"}>{item.amount > 0 ? "+" : ""}{Number(item.amount).toLocaleString()}</span></div>
                                      <div><b>วันที่:</b> {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: th })}</div>
                                      <div><b>ชื่อบิล:</b> {item.related_bill_number || "-"}</div>
                                      <div><b>คำอธิบาย:</b> {item.description || "-"}</div>
                                    </div>
                                    <DrawerFooter>
                                      <DrawerClose asChild>
                                        <button className="w-full py-2 rounded bg-green-700 text-white font-semibold hover:bg-green-800 transition">ปิด</button>
                                      </DrawerClose>
                                    </DrawerFooter>
                                  </DrawerContent>
                                </Drawer>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
    </SidebarInset>
    </SidebarProvider>
    </DirectionProvider>
  );
}
