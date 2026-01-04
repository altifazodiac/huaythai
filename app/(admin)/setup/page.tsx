"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Shield, 
  Bell, 
  Database,
  Globe,
  Save,
  Key,
  Lock,
  Smartphone,
  CreditCard,
  Percent,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';

export default function AdminSetupPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'สิงโตทองคำ 77',
    siteDescription: 'ระบบจัดการหวยออนไลน์',
    language: 'th',
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    maintenanceMode: false,
  });

  // Commission Settings
  const [commissionSettings, setCommissionSettings] = useState({
    defaultCommissionRate: 5,
    minCommissionRate: 0,
    maxCommissionRate: 15,
    autoCalculate: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 6,
    requirePhoneVerification: false,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    lineNotifyEnabled: false,
    lineNotifyToken: '',
    emailNotifyEnabled: false,
    notifyOnNewOrder: true,
    notifyOnWinning: true,
  });

  // Lottery Settings
  const [lotterySettings, setLotterySettings] = useState({
    defaultPayoutCap: 200000,
    enableNumberCap: true,
    autoCloseBeforeDraw: 30,
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // โหลดการตั้งค่าจาก Supabase
  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      data?.forEach((item) => {
        const value = item.setting_value;
        switch (item.setting_key) {
          case 'general':
            setGeneralSettings(value);
            break;
          case 'commission':
            setCommissionSettings(value);
            break;
          case 'security':
            setSecuritySettings(value);
            break;
          case 'notification':
            setNotificationSettings(value);
            break;
          case 'lottery':
            setLotterySettings(value);
            break;
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  // บันทึกการตั้งค่าลง Supabase
  const handleSave = async (section: string, key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) throw error;
      showMessage('success', `บันทึกการตั้งค่า${section}สำเร็จ`);
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 space-y-6 p-4 md:p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ตั้งค่าระบบ</h1>
          <p className="text-muted-foreground">จัดการการตั้งค่าทั้งหมดของระบบ Admin</p>
        </div>
        <div className="flex items-center gap-2">
          {message && (
            <Badge variant={message.type === 'success' ? 'default' : 'destructive'} className="text-sm">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
              {message.text}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">ทั่วไป</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">ค่าคอมมิชชั่น</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">ความปลอดภัย</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">การแจ้งเตือน</span>
          </TabsTrigger>
          <TabsTrigger value="lottery" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">หวย</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                ข้อมูลเว็บไซต์
              </CardTitle>
              <CardDescription>ตั้งค่าข้อมูลพื้นฐานของระบบ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">ชื่อเว็บไซต์</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">คำอธิบาย</Label>
                  <Input
                    id="siteDescription"
                    value={generalSettings.siteDescription}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ภาษา</Label>
                  <Select 
                    value={generalSettings.language} 
                    onValueChange={(v) => setGeneralSettings({ ...generalSettings, language: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="th">ไทย</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>เขตเวลา</Label>
                  <Select 
                    value={generalSettings.timezone} 
                    onValueChange={(v) => setGeneralSettings({ ...generalSettings, timezone: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>สกุลเงิน</Label>
                  <Select 
                    value={generalSettings.currency} 
                    onValueChange={(v) => setGeneralSettings({ ...generalSettings, currency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">บาท (THB)</SelectItem>
                      <SelectItem value="USD">Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>โหมดบำรุงรักษา</CardTitle>
              <CardDescription>เปิดใช้งานเมื่อต้องการปิดระบบชั่วคราว</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">เปิดโหมดบำรุงรักษา</p>
                  <p className="text-sm text-muted-foreground">ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงระบบได้</p>
                </div>
                <Switch
                  checked={generalSettings.maintenanceMode}
                  onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, maintenanceMode: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('ทั่วไป', 'general', generalSettings)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        {/* Commission Settings Tab */}
        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                ตั้งค่าค่าคอมมิชชั่น
              </CardTitle>
              <CardDescription>กำหนดอัตราค่าคอมมิชชั่นสำหรับตัวแทน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>อัตราค่าคอมมิชชั่นเริ่มต้น (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionSettings.defaultCommissionRate}
                    onChange={(e) => setCommissionSettings({ ...commissionSettings, defaultCommissionRate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราต่ำสุด (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionSettings.minCommissionRate}
                    onChange={(e) => setCommissionSettings({ ...commissionSettings, minCommissionRate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราสูงสุด (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionSettings.maxCommissionRate}
                    onChange={(e) => setCommissionSettings({ ...commissionSettings, maxCommissionRate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">คำนวณค่าคอมมิชชั่นอัตโนมัติ</p>
                  <p className="text-sm text-muted-foreground">คำนวณและบันทึกค่าคอมมิชชั่นเมื่อมีการซื้อหวย</p>
                </div>
                <Switch
                  checked={commissionSettings.autoCalculate}
                  onCheckedChange={(v) => setCommissionSettings({ ...commissionSettings, autoCalculate: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('ค่าคอมมิชชั่น', 'commission', commissionSettings)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                การยืนยันตัวตน
              </CardTitle>
              <CardDescription>ตั้งค่าความปลอดภัยในการเข้าสู่ระบบ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Timeout (นาที)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">ระยะเวลาที่ผู้ใช้ไม่ได้ใช้งานก่อนถูก logout</p>
                </div>
                <div className="space-y-2">
                  <Label>จำนวนครั้งที่ login ผิดพลาดสูงสุด</Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">ล็อคบัญชีหลังจาก login ผิดพลาดตามจำนวนที่กำหนด</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                นโยบายรหัสผ่าน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ความยาวรหัสผ่านขั้นต่ำ</Label>
                <Input
                  type="number"
                  min="4"
                  max="32"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: Number(e.target.value) })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">บังคับยืนยันเบอร์โทรศัพท์</p>
                  <p className="text-sm text-muted-foreground">ผู้ใช้ต้องยืนยันเบอร์โทรก่อนใช้งาน</p>
                </div>
                <Switch
                  checked={securitySettings.requirePhoneVerification}
                  onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, requirePhoneVerification: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('ความปลอดภัย', 'security', securitySettings)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                LINE Notify
              </CardTitle>
              <CardDescription>ตั้งค่าการแจ้งเตือนผ่าน LINE</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">เปิดใช้งาน LINE Notify</p>
                  <p className="text-sm text-muted-foreground">ส่งการแจ้งเตือนไปยัง LINE Group</p>
                </div>
                <Switch
                  checked={notificationSettings.lineNotifyEnabled}
                  onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, lineNotifyEnabled: v })}
                />
              </div>
              {notificationSettings.lineNotifyEnabled && (
                <div className="space-y-2">
                  <Label>LINE Notify Token</Label>
                  <Input
                    type="password"
                    placeholder="กรอก LINE Notify Token"
                    value={notificationSettings.lineNotifyToken}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, lineNotifyToken: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    รับ Token ได้ที่ <a href="https://notify-bot.line.me/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">notify-bot.line.me</a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                เหตุการณ์ที่แจ้งเตือน
              </CardTitle>
              <CardDescription>เลือกเหตุการณ์ที่ต้องการรับการแจ้งเตือน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">แจ้งเตือนเมื่อมีคำสั่งซื้อใหม่</p>
                  <p className="text-sm text-muted-foreground">รับการแจ้งเตือนทุกครั้งที่มีการซื้อหวย</p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnNewOrder}
                  onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, notifyOnNewOrder: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">แจ้งเตือนเมื่อมีผู้ถูกรางวัล</p>
                  <p className="text-sm text-muted-foreground">รับการแจ้งเตือนเมื่อมีผู้ถูกรางวัล</p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnWinning}
                  onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, notifyOnWinning: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('การแจ้งเตือน', 'notification', notificationSettings)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        {/* Lottery Settings Tab */}
        <TabsContent value="lottery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                ตั้งค่าการจ่ายรางวัล
              </CardTitle>
              <CardDescription>กำหนดเพดานการจ่ายรางวัลและเลขอั้น</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เพดานการจ่ายรางวัลสูงสุด (บาท)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={lotterySettings.defaultPayoutCap}
                    onChange={(e) => setLotterySettings({ ...lotterySettings, defaultPayoutCap: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">จำกัดยอดจ่ายรางวัลสูงสุดต่อรายการ</p>
                </div>
                <div className="space-y-2">
                  <Label>ปิดรับก่อนออกผล (นาที)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={lotterySettings.autoCloseBeforeDraw}
                    onChange={(e) => setLotterySettings({ ...lotterySettings, autoCloseBeforeDraw: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">ปิดรับอัตโนมัติก่อนเวลาออกผล</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">เปิดใช้งานระบบเลขอั้น</p>
                  <p className="text-sm text-muted-foreground">จำกัดยอดรับเลขที่มีความเสี่ยงสูง</p>
                </div>
                <Switch
                  checked={lotterySettings.enableNumberCap}
                  onCheckedChange={(v) => setLotterySettings({ ...lotterySettings, enableNumberCap: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                สถานะฐานข้อมูล
              </CardTitle>
              <CardDescription>ตรวจสอบการเชื่อมต่อ Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  เชื่อมต่อแล้ว
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Project: wbvgdqiozztgqodtajui
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('หวย', 'lottery', lotterySettings)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
