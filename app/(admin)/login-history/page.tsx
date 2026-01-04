"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { 
  Loader2, 
  MonitorSmartphone, 
  Globe, 
  Clock, 
  Smartphone, 
  Monitor, 
  Tablet,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LoginHistoryItem {
  id: string;
  user_id: string;
  email: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  status?: string;
}

// Parse user agent to get device info
function parseUserAgent(ua: string | null): { device: string; browser: string; os: string; icon: React.ReactNode } {
  if (!ua) return { device: "ไม่ทราบ", browser: "ไม่ทราบ", os: "ไม่ทราบ", icon: <MonitorSmartphone className="h-4 w-4" /> };
  
  const uaLower = ua.toLowerCase();
  
  // Detect device type
  let device = "Desktop";
  let icon: React.ReactNode = <Monitor className="h-4 w-4" />;
  
  if (uaLower.includes("iphone") || uaLower.includes("android") && uaLower.includes("mobile")) {
    device = "มือถือ";
    icon = <Smartphone className="h-4 w-4" />;
  } else if (uaLower.includes("ipad") || uaLower.includes("tablet")) {
    device = "แท็บเล็ต";
    icon = <Tablet className="h-4 w-4" />;
  }
  
  // Detect OS
  let os = "ไม่ทราบ";
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macintosh")) os = "macOS";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("linux")) os = "Linux";
  
  // Detect browser
  let browser = "ไม่ทราบ";
  if (uaLower.includes("chrome") && !uaLower.includes("edg")) browser = "Chrome";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("edg")) browser = "Edge";
  else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";
  
  return { device, browser, os, icon };
}

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("login_history")
      .select("*")
      .eq("user_id", user.id)
      .order("login_at", { ascending: false })
      .limit(50);
      
    if (!error && data) setHistory(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              ประวัติการเข้าสู่ระบบ
            </CardTitle>
            <CardDescription className="mt-1">
              แสดงประวัติการเข้าสู่ระบบ 50 รายการล่าสุด
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ไม่พบประวัติการเข้าสู่ระบบ</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">วันเวลา</TableHead>
                    <TableHead>อุปกรณ์ / เบราว์เซอร์</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-center w-[100px]">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item, idx) => {
                    const deviceInfo = parseUserAgent(item.user_agent);
                    const isLatest = idx === 0;
                    const loginDate = new Date(item.login_at);
                    
                    return (
                      <TableRow 
                        key={item.id} 
                        className={isLatest ? "bg-primary/5" : ""}
                      >
                        {/* วันเวลา */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {format(loginDate, "d MMM yyyy", { locale: th })}
                            </div>
                            <div className="text-sm text-muted-foreground pl-6">
                              {format(loginDate, "HH:mm:ss น.")}
                            </div>
                            <div className="text-xs text-muted-foreground pl-6">
                              ({formatDistanceToNow(loginDate, { addSuffix: true, locale: th })})
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* อุปกรณ์ */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {deviceInfo.icon}
                              <span className="font-medium">{deviceInfo.device}</span>
                            </div>
                            <div className="text-sm text-muted-foreground pl-6">
                              {deviceInfo.os} • {deviceInfo.browser}
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* IP Address */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {item.ip_address || "-"}
                            </code>
                          </div>
                        </TableCell>
                        
                        {/* สถานะ */}
                        <TableCell className="text-center">
                          {isLatest ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              ล่าสุด
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              สำเร็จ
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Summary */}
          {history.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>แสดง {history.length} รายการ</span>
              <span>
                เข้าสู่ระบบล่าสุด: {format(new Date(history[0].login_at), "d MMMM yyyy เวลา HH:mm น.", { locale: th })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
