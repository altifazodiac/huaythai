"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/supabaseClient';

interface LotteryNotification {
    id: string;
    notification_time: string;
    lottery_names: string[];
    total_results: number;
    message: string;
    notification_type: 'import_success' | 'import_error' | 'send_success' | 'send_error';
    created_at: string;
}

interface LotteryNotificationToastProps {
    /**
     * ช่วงเวลาในการตรวจสอบ notification ใหม่ (มิลลิวินาที)
     * ค่าเริ่มต้น: 30000 (30 วินาที)
     */
    pollingInterval?: number;
    /**
     * แสดงเฉพาะ notification ที่สร้างขึ้นใน X นาทีที่ผ่านมา
     * ค่าเริ่มต้น: 5 นาที
     */
    maxAgeMinutes?: number;
}

export default function LotteryNotificationToast({ 
    pollingInterval = 30000, 
    maxAgeMinutes = 5 
}: LotteryNotificationToastProps) {
    const [lastNotificationTime, setLastNotificationTime] = useState<string>('');
    const [isPolling, setIsPolling] = useState(false);

    const fetchNotifications = async () => {
        if (isPolling) return;
        
        setIsPolling(true);
        try {
            const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
            
            // ดึงข้อมูลจากทั้งสองตาราง (import และ send notifications)
            const [importResults, sendResults] = await Promise.all([
                supabase
                    .from('lottery_import_notifications')
                    .select('*')
                    .gte('created_at', cutoffTime)
                    .gt('created_at', lastNotificationTime)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('lottery_send_notifications')
                    .select('*')
                    .gte('created_at', cutoffTime)
                    .gt('created_at', lastNotificationTime)
                    .order('created_at', { ascending: false })
            ]);

            const allNotifications: LotteryNotification[] = [
                ...(importResults.data || []),
                ...(sendResults.data || [])
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            if (allNotifications.length > 0) {
                // อัปเดตเวลาของ notification ล่าสุด
                setLastNotificationTime(allNotifications[0].created_at);

                // แสดง toast สำหรับแต่ละ notification
                allNotifications.forEach(notification => {
                    showNotificationToast(notification);
                });
            }
        } catch (error) {
            console.error('Error fetching lottery notifications:', error);
        } finally {
            setIsPolling(false);
        }
    };

    const showNotificationToast = (notification: LotteryNotification) => {
        const { notification_type, lottery_names, total_results, message } = notification;
        
        // สร้างข้อความที่แสดงใน toast
        const displayMessage = lottery_names.length > 0 
            ? `${getTypeEmoji(notification_type)} ${getTypeText(notification_type)}\n📋 ${lottery_names.join(', ')}\n🔢 ${total_results} รายการ`
            : message;

        // เลือกสีและไอคอนตามประเภท notification
        switch (notification_type) {
            case 'import_success':
                toast.success(displayMessage, {
                    duration: 5000,
                    position: 'top-right',
                    className: 'text-sm',
                });
                break;
            case 'send_success':
                toast.success(displayMessage, {
                    duration: 5000,
                    position: 'top-right',
                    className: 'text-sm',
                });
                break;
            case 'import_error':
                toast.error(displayMessage, {
                    duration: 8000,
                    position: 'top-right',
                    className: 'text-sm',
                });
                break;
            case 'send_error':
                toast.error(displayMessage, {
                    duration: 8000,
                    position: 'top-right',
                    className: 'text-sm',
                });
                break;
        }
    };

    const getTypeEmoji = (type: string) => {
        switch (type) {
            case 'import_success': return '🎯';
            case 'send_success': return '📤';
            case 'import_error': return '❌';
            case 'send_error': return '❌';
            default: return '📢';
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'import_success': return 'ดึงผลหวยสำเร็จ';
            case 'send_success': return 'ส่งผลหวยสำเร็จ';
            case 'import_error': return 'ดึงผลหวยล้มเหลว';
            case 'send_error': return 'ส่งผลหวยล้มเหลว';
            default: return 'แจ้งเตือน';
        }
    };

    useEffect(() => {
        // ดึงข้อมูลครั้งแรก
        fetchNotifications();

        // ตั้งค่า polling interval
        const interval = setInterval(fetchNotifications, pollingInterval);

        return () => clearInterval(interval);
    }, [pollingInterval, maxAgeMinutes]);

    // Component นี้ไม่มี UI ที่แสดง - ทำงานเป็น background service
    return null;
}

// Hook สำหรับใช้งานใน component อื่น
export function useLotteryNotifications() {
    const [notifications, setNotifications] = useState<LotteryNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchRecentNotifications = async (limitMinutes: number = 60) => {
        setIsLoading(true);
        try {
            const cutoffTime = new Date(Date.now() - limitMinutes * 60 * 1000).toISOString();
            
            const [importResults, sendResults] = await Promise.all([
                supabase
                    .from('lottery_import_notifications')
                    .select('*')
                    .gte('created_at', cutoffTime)
                    .order('created_at', { ascending: false })
                    .limit(20),
                supabase
                    .from('lottery_send_notifications')
                    .select('*')
                    .gte('created_at', cutoffTime)
                    .order('created_at', { ascending: false })
                    .limit(20)
            ]);

            const allNotifications: LotteryNotification[] = [
                ...(importResults.data || []),
                ...(sendResults.data || [])
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotifications(allNotifications);
        } catch (error) {
            console.error('Error fetching recent notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        notifications,
        isLoading,
        fetchRecentNotifications
    };
} 