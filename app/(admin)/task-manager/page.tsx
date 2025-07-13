'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Search, ListFilter, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { startTask } from '@/lib/task-actions';

// --- Interfaces ---
interface ScheduledTask {
  id: string;
  name: string;
  type: 'scrape' | 'send' | 'cleanup';
  scheduled_time: string;
  draw_time: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  last_run?: string;
  next_run: string;
  schedule_id?: number;
  lottery_sub_type_id?: number;
  created_at: string;
  updated_at: string;
}

interface TaskLog {
  id: string;
  task_id: string;
  task_name: string;
  task_type: string;
  status: 'completed' | 'failed';
  error_message?: string;
  execution_time: string;
  created_at: string;
}

interface SchedulerData {
  tasks: ScheduledTask[];
  recentLogs: TaskLog[];
  queueStatus?: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  };
}

type StatusFilter = 'all' | 'pending' | 'running' | 'completed' | 'failed';

// --- Helper Functions ---
const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-500 hover:bg-yellow-600', icon: Clock, text: 'รอ' },
    running: { color: 'bg-blue-500 hover:bg-blue-600', icon: RefreshCw, text: 'กำลังรัน' },
    completed: { color: 'bg-green-500 hover:bg-green-600', icon: CheckCircle, text: 'สำเร็จ' },
    failed: { color: 'bg-red-500 hover:bg-red-600', icon: XCircle, text: 'ผิดพลาด' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </Badge>
  );
};

const getTaskTypeBadge = (type: string) => {
  const typeConfig = {
    scrape: { color: 'bg-sky-600 hover:bg-sky-700', text: 'สครีป' },
    send: { color: 'bg-teal-600 hover:bg-teal-700', text: 'ส่ง' },
    cleanup: { color: 'bg-slate-600 hover:bg-slate-700', text: 'ทำความสะอาด' },
  };
  const config = typeConfig[type as keyof typeof typeConfig] || { color: 'bg-gray-600', text: type };
  return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
};

// --- Main Page Component ---
export default function TaskManagerPage() {
  const [supabase] = useState(() => createClient());
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Supabase Functions ---
  const fetchSchedulerData = async () => {
    try {
      console.log('🔍 Task Manager: Fetching scheduler data from Supabase...');
      setRefreshing(true);
      setError(null);
      
      // ดึงข้อมูล scheduled_tasks
      console.log('📋 Fetching scheduled tasks...');
      const { data: tasks, error: tasksError } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('next_run');

      if (tasksError) {
        console.error('❌ Tasks Error:', tasksError);
        throw new Error(`ไม่สามารถดึงข้อมูล Tasks ได้: ${tasksError.message}`);
      }
      console.log('✅ Tasks fetched:', tasks?.length || 0, 'items');

      // ดึงข้อมูล task_logs
      console.log('📋 Fetching task logs...');
      const { data: logs, error: logsError } = await supabase
        .from('task_logs')
        .select('*')
        .order('execution_time', { ascending: false })
        .limit(20);

      if (logsError) {
        console.error('❌ Logs Error:', logsError);
        throw new Error(`ไม่สามารถดึงข้อมูล Logs ได้: ${logsError.message}`);
      }
      console.log('✅ Logs fetched:', logs?.length || 0, 'items');

      // ดึงข้อมูล queue status
      console.log('📋 Fetching queue status...');
      const { data: queueData, error: queueError } = await supabase.rpc('get_queue_status');
      
      if (queueError) {
        console.error('❌ Queue Status Error:', queueError);
      } else {
        console.log('✅ Queue status fetched:', queueData);
      }

      setSchedulerData({
        tasks: tasks || [],
        recentLogs: logs || [],
        queueStatus: queueData?.stats || null
      });
      setError(null);
      console.log('✅ Scheduler data fetch completed successfully');
      
    } catch (err) {
      console.error('💥 Fetch Scheduler Data Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูล Scheduler ได้';
      setError(errorMessage);
      setSchedulerData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'running' | 'completed' | 'failed', errorMessage?: string) => {
    try {
      console.log(`🔄 Updating task ${taskId} status to ${status}`);
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'running') {
        updateData.last_run = new Date().toISOString();
      }

      const { error } = await supabase
        .from('scheduled_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) {
        console.error('❌ Update Task Error:', error);
        throw error;
      }

      // บันทึก log
      if (status === 'completed' || status === 'failed') {
        const task = schedulerData?.tasks.find(t => t.id === taskId);
        if (task) {
          const { error: logError } = await supabase
            .from('task_logs')
            .insert({
              task_id: taskId,
              task_name: task.name,
              task_type: task.type,
              status: status === 'completed' ? 'completed' : 'failed',
              error_message: errorMessage || null,
              execution_time: new Date().toISOString()
            });

          if (logError) {
            console.error('❌ Log Insert Error:', logError);
          }
        }
      }

      console.log('✅ Task status updated successfully');
      
    } catch (err) {
      console.error('💥 Update Task Status Error:', err);
      throw err;
    }
  };

  const runTask = async (task: ScheduledTask) => {
    try {
      console.log(`🎯 Instructing task to run: ${task.name}`);
      setError(null);
      
      // เริ่ม task ใน background ผ่าน server action
      const result = await startTask(
        task.id,
        task.type,
        task.draw_time,
        task.lottery_sub_type_id
      );
      
      console.log(`✅ ${result.message}`);

      // รีเฟรชข้อมูลหลังจาก 2 วินาทีเพื่อให้ background job มีเวลาอัปเดตสถานะ
      setTimeout(() => {
        fetchSchedulerData();
      }, 2000);
      
    } catch (err) {
      console.error('💥 Start Task Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'การเริ่ม Task ไม่สำเร็จ';
      setError(errorMessage);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchSchedulerData();
    const interval = setInterval(fetchSchedulerData, 10000); // Auto-refresh every 10 seconds (background jobs need frequent updates)
    return () => clearInterval(interval);
  }, []);

  // --- Data Processing & Memoization ---
  const summaryCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    if (!schedulerData?.tasks) return counts;
    schedulerData.tasks.forEach(task => {
      counts.all++;
      if (counts[task.status as StatusFilter] !== undefined) {
        counts[task.status as StatusFilter]++;
      }
    });
    return counts;
  }, [schedulerData?.tasks]);

  const groupedAndFilteredTasks = useMemo(() => {
    if (!schedulerData?.tasks) return {};
    
    const filtered = schedulerData.tasks.filter(task => {
      const statusMatch = statusFilter === 'all' || task.status === statusFilter;
      const searchMatch = searchTerm === '' || task.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });

    return filtered.reduce((acc, task) => {
      const key = task.draw_time;
      if (!acc[key]) {
        acc[key] = { tasks: [], lotteryNames: new Set(), statusCounts: { pending: 0, running: 0, completed: 0, failed: 0 } };
      }
      acc[key].tasks.push(task);
      const cleanName = task.name.replace(/^(Scrape|Send)\s/i, '').replace(/lottery results for/i, '').trim();
      if (!/^\d{2}:\d{2}:\d{2}$/.test(cleanName)) {
        acc[key].lotteryNames.add(cleanName);
      }
      acc[key].statusCounts[task.status]++;
      return acc;
    }, {} as Record<string, { tasks: ScheduledTask[]; lotteryNames: Set<string>; statusCounts: Record<string, number> }>);
  }, [schedulerData?.tasks, statusFilter, searchTerm]);

  if (loading && !schedulerData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-3 text-lg text-gray-700 dark:text-gray-200">กำลังโหลดข้อมูล Scheduler...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-background min-h-screen">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50">Task Manager</h1>
            <p className="text-gray-500 dark:text-gray-400">จัดการและตรวจสอบ Scheduled Tasks จาก Supabase</p>
            {/* Debug Info */}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>Tasks: {schedulerData?.tasks?.length || 0}</span>
              <span>•</span>
              <span>Logs: {schedulerData?.recentLogs?.length || 0}</span>
              <span>•</span>
              <span>Source: Supabase Direct</span>
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </div>
          </div>
          <Button onClick={fetchSchedulerData} disabled={refreshing} variant="outline" className="mt-4 md:mt-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <span className="font-semibold">เกิดข้อผิดพลาด:</span>
                <span className="text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded border font-mono">
                  {error}
                </span>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  💡 เปิด Browser Console (F12) เพื่อดูรายละเอียดเพิ่มเติม
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- Left Column --- */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-blue-500" />
                  Supabase Direct Connection
                </CardTitle>
                <CardDescription>
                  ข้อมูลจาก scheduled_tasks และ task_logs โดยตรง
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>• ไม่ใช้ /api/scheduler</div>
                  <div>• เชื่อมต่อ Supabase โดยตรง</div>
                  <div>• อัปเดตแบบ Real-time</div>
                </div>
              </CardContent>
            </Card>
            
            {/* Summary Card */}
            <Card>
                <CardHeader><CardTitle>สรุปสถานะ Tasks</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {Object.entries(summaryCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center space-x-2 text-sm">
                            {getStatusBadge(status)}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{count}</span>
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{status === 'all' ? 'ทั้งหมด' : status}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Queue Status Card */}
            <Card>
                <CardHeader><CardTitle>Queue Status</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {schedulerData?.queueStatus ? (
                        <>
                            <div className="flex items-center space-x-2 text-sm">
                                <Badge className="bg-yellow-500 text-white">Queue</Badge>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{schedulerData.queueStatus.queued}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <Badge className="bg-blue-500 text-white">Running</Badge>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{schedulerData.queueStatus.running}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <Badge className="bg-green-500 text-white">Complete</Badge>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{schedulerData.queueStatus.completed}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <Badge className="bg-red-500 text-white">Failed</Badge>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{schedulerData.queueStatus.failed}</span>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2 text-center text-gray-500 dark:text-gray-400">No queue data</div>
                    )}
                </CardContent>
            </Card>
          </div>

          {/* --- Right Column --- */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks">Scheduled Tasks ({summaryCounts.all})</TabsTrigger>
                <TabsTrigger value="logs">Recent Logs ({schedulerData?.recentLogs?.length || 0})</TabsTrigger>
              </TabsList>
              
              {/* Tasks Tab */}
              <TabsContent value="tasks" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-1/2">
                           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input placeholder="ค้นหาชื่อ Task..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                           {(['all', 'pending', 'running', 'failed', 'completed'] as StatusFilter[]).map(s => (
                              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </Button>
                           ))}
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(groupedAndFilteredTasks).length > 0 ? (
                        Object.entries(groupedAndFilteredTasks)
                        .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
                        .map(([time, group]) => (
                        <AccordionItem value={time} key={time}>
                          <AccordionTrigger className="hover:bg-gray-100 dark:hover:bg-slate-800 px-4 rounded-md">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4">
                                    <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{time}</div>
                                    <div className="text-left text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                                        {Array.from(group.lotteryNames).slice(0, 2).join(', ')}
                                        {group.lotteryNames.size > 2 ? '...' : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {Object.entries(group.statusCounts).map(([status, count]) => count > 0 && (
                                        <div key={status} className="flex items-center">{getStatusBadge(status)}<span className="ml-1 text-xs font-bold">{count}</span></div>
                                    ))}
                                </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Task</TableHead>
                                  <TableHead>ประเภท</TableHead>
                                  <TableHead>สถานะ</TableHead>
                                  <TableHead>รันครั้งต่อไป</TableHead>
                                  <TableHead>จัดการ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.tasks.map(task => (
                                  <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.name}</TableCell>
                                    <TableCell>{getTaskTypeBadge(task.type)}</TableCell>
                                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                                    <TableCell>{formatDateTime(task.next_run)}</TableCell>
                                    <TableCell>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => runTask(task)} 
                                        disabled={loading || task.status === 'running'}
                                      >
                                        <Play className="w-3 h-3 mr-1" /> รัน
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      ))) : (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                          <ListFilter className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <h3 className="mt-2 text-sm font-medium">ไม่พบ Tasks</h3>
                          <p className="mt-1 text-sm">ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง</p>
                        </div>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="mt-4">
                <Card>
                   <CardHeader><CardTitle>Recent Logs</CardTitle></CardHeader>
                   <CardContent>
                    {schedulerData?.recentLogs && schedulerData.recentLogs.length > 0 ? (
                      <Table>
                         <TableHeader>
                           <TableRow>
                              <TableHead>Task</TableHead>
                              <TableHead>ประเภท</TableHead>
                              <TableHead>สถานะ</TableHead>
                              <TableHead>เวลาที่รัน</TableHead>
                              <TableHead>ข้อผิดพลาด</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {schedulerData.recentLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell className="font-medium">{log.task_name}</TableCell>
                                <TableCell>{getTaskTypeBadge(log.task_type)}</TableCell>
                                <TableCell>{getStatusBadge(log.status)}</TableCell>
                                <TableCell>{formatDateTime(log.execution_time)}</TableCell>
                                <TableCell className="text-red-600 dark:text-red-500 text-xs max-w-xs truncate">{log.error_message || '-'}</TableCell>
                              </TableRow>
                           ))}
                         </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-16 text-gray-500 dark:text-gray-400">ไม่พบ Logs</div>
                    )}
                   </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 