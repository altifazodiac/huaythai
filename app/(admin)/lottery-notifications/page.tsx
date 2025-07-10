"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Download, Bell, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useLotteryNotifications } from '@/components/LotteryNotificationToast';
import { toast } from 'sonner';

interface LotteryNotification {
    id: string;
    notification_time: string;
    lottery_names: string[];
    total_results: number;
    message: string;
    notification_type: 'import_success' | 'import_error' | 'send_success' | 'send_error';
    created_at: string;
}

export default function LotteryNotificationsPage() {
    const { notifications, isLoading, fetchRecentNotifications } = useLotteryNotifications();
    const [selectedTab, setSelectedTab] = useState('all');
    const [timeRange, setTimeRange] = useState(60); // นาที

    useEffect(() => {
        fetchRecentNotifications(timeRange);
    }, [timeRange]);

    const handleRefresh = () => {
        fetchRecentNotifications(timeRange);
        toast.success('รีเฟรชข้อมูลเรียบร้อย');
    };

    const filteredNotifications = notifications.filter(notification => {
        if (selectedTab === 'all') return true;
        if (selectedTab === 'import') return notification.notification_type.includes('import');
        if (selectedTab === 'send') return notification.notification_type.includes('send');
        if (selectedTab === 'errors') return notification.notification_type.includes('error');
        return true;
    });

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'import_success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'send_success': return <Send className="w-4 h-4 text-blue-500" />;
            case 'import_error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'send_error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const getNotificationBadge = (type: string) => {
        switch (type) {
            case 'import_success': return <Badge variant="default" className="bg-green-100 text-green-800">ดึงข้อมูลสำเร็จ</Badge>;
            case 'send_success': return <Badge variant="default" className="bg-blue-100 text-blue-800">ส่งข้อมูลสำเร็จ</Badge>;
            case 'import_error': return <Badge variant="destructive">ดึงข้อมูลล้มเหลว</Badge>;
            case 'send_error': return <Badge variant="destructive">ส่งข้อมูลล้มเหลว</Badge>;
            default: return <Badge variant="secondary">ไม่ระบุ</Badge>;
        }
    };

    const getSuccessRate = () => {
        const total = notifications.length;
        const success = notifications.filter(n => n.notification_type.includes('success')).length;
        return total > 0 ? Math.round((success / total) * 100) : 0;
    };

    const getRecentStats = () => {
        const importSuccess = notifications.filter(n => n.notification_type === 'import_success').length;
        const sendSuccess = notifications.filter(n => n.notification_type === 'send_success').length;
        const importError = notifications.filter(n => n.notification_type === 'import_error').length;
        const sendError = notifications.filter(n => n.notification_type === 'send_error').length;
        
        return { importSuccess, sendSuccess, importError, sendError };
    };

    const stats = getRecentStats();

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">ประวัติการแจ้งเตือนหวย</h1>
                    <p className="text-muted-foreground mt-2">
                        ติดตามสถานะการดึงและส่งผลหวยแบบเรียลไทม์
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        className="border rounded px-3 py-2"
                    >
                        <option value={30}>30 นาทีที่ผ่านมา</option>
                        <option value={60}>1 ชั่วโมงที่ผ่านมา</option>
                        <option value={180}>3 ชั่วโมงที่ผ่านมา</option>
                        <option value={360}>6 ชั่วโมงที่ผ่านมา</option>
                        <option value={1440}>24 ชั่วโมงที่ผ่านมา</option>
                    </select>
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        รีเฟรช
                    </Button>
                </div>
            </div>

            {/* สถิติโดยรวม */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notifications.length}</div>
                        <p className="text-xs text-muted-foreground">การแจ้งเตือน</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">ดึงข้อมูลสำเร็จ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.importSuccess}</div>
                        <p className="text-xs text-muted-foreground">ครั้ง</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">ส่งข้อมูลสำเร็จ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.sendSuccess}</div>
                        <p className="text-xs text-muted-foreground">ครั้ง</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">ข้อผิดพลาด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.importError + stats.sendError}</div>
                        <p className="text-xs text-muted-foreground">ครั้ง</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">อัตราสำเร็จ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{getSuccessRate()}%</div>
                        <p className="text-xs text-muted-foreground">ความสำเร็จ</p>
                    </CardContent>
                </Card>
            </div>

            {/* รายละเอียดการแจ้งเตือน */}
            <Card>
                <CardHeader>
                    <CardTitle>รายละเอียดการแจ้งเตือน</CardTitle>
                    <CardDescription>
                        ดูรายละเอียดการแจ้งเตือนทั้งหมดใน {timeRange} นาทีที่ผ่านมา
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                            <TabsTrigger value="import">การดึงข้อมูล</TabsTrigger>
                            <TabsTrigger value="send">การส่งข้อมูล</TabsTrigger>
                            <TabsTrigger value="errors">ข้อผิดพลาด</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value={selectedTab} className="mt-4">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        ไม่มีการแจ้งเตือนในช่วงเวลาที่เลือก
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>เวลา</TableHead>
                                            <TableHead>ประเภท</TableHead>
                                            <TableHead>หวยที่ประมวลผล</TableHead>
                                            <TableHead>จำนวน</TableHead>
                                            <TableHead>ข้อความ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredNotifications.map((notification) => (
                                            <TableRow key={notification.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: th })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getNotificationIcon(notification.notification_type)}
                                                        {getNotificationBadge(notification.notification_type)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {notification.lottery_names.length > 0 ? (
                                                        <div className="max-w-xs">
                                                            {notification.lottery_names.slice(0, 3).map((name, idx) => (
                                                                <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                                                    {name}
                                                                </Badge>
                                                            ))}
                                                            {notification.lottery_names.length > 3 && (
                                                                <Badge variant="outline">
                                                                    +{notification.lottery_names.length - 3} อื่นๆ
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {notification.total_results} รายการ
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <div className="truncate text-sm text-muted-foreground">
                                                        {notification.message}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
} 