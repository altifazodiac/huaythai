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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-6 px-2 md:px-0 flex flex-col items-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-blue-900">ธุรกรรมเครดิต</h1>
        <p className="text-muted-foreground mb-4">รวมธุรกรรมการสั่งซื้อและเคลื่อนไหวเ</p>
        <Input
          placeholder="ค้นหาด้วยชื่อ, อีเมล, ประเภท, จำนวน, วันที่..."
          className="mb-4"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading ? (
          <SpectacularLoader message="กำลังโหลดธุรกรรม..." baseColor="indigo" />
        ) : (
          <div className="space-y-4">
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
                filtered.map((item, idx) => {
                  const Icon = getIcon(item.transaction_type);
                  return (
                    <Drawer key={item.id} open={openId === item.id} onOpenChange={open => setOpenId(open ? item.id : null)}>
                      <DrawerTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 30 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <Card className="flex items-center gap-4 p-4 shadow-md hover:shadow-xl transition-shadow bg-white/90 cursor-pointer relative">
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                                <Icon className="w-7 h-7 text-blue-600" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardHeader className="p-0 pb-1 flex flex-row items-start justify-between">
                                <div>
                                  <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
                                    {getTypeLabel(item.transaction_type)}
                                    <span className="text-xs text-muted-foreground font-normal">{item.description}</span>
                                  </CardTitle>
                                  <CardDescription className="text-xs text-muted-foreground">
                                    {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                                  </CardDescription>
                                </div>
                                <div className="font-medium text-sm truncate text-right ml-2 min-w-[60px]">{item.profiles?.name || "-"}</div>
                              </CardHeader>
                              <CardContent className="p-0 pt-1 flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>{item.profiles?.name?.[0] || item.profiles?.email?.[0] || "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-muted-foreground truncate">
                                    {item.related_bill_number ? `บิล: ${item.related_bill_number}` : (item.description || "-")}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold text-lg ${item.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                                    {item.amount > 0 ? "+" : ""}{Number(item.amount).toLocaleString()}
                                  </div>
                                </div>
                              </CardContent>
                              {item.transaction_type === "purchase" && (
                                <div className="pt-2">
                                  <Progress value={100} className="h-1 bg-blue-200" />
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
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
                          <div><b>จำนวน:</b> <span className={item.amount > 0 ? "text-green-600" : "text-red-500"}>{item.amount > 0 ? "+" : ""}{Number(item.amount).toLocaleString()}</span></div>
                          <div><b>วันที่:</b> {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: th })}</div>
                          <div><b>ชื่อบิล:</b> {item.related_bill_number || "-"}</div>
                          <div><b>คำอธิบาย:</b> {item.description || "-"}</div>
                        </div>
                        <DrawerFooter>
                          <DrawerClose asChild>
                            <button className="w-full py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">ปิด</button>
                          </DrawerClose>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                  );
                })
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
