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
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Search, ListFilter } from 'lucide-react';

// --- Interfaces ---
interface ScheduledTask {
  id: string;
  name: string;
  type: 'scrape' | 'send' | 'cleanup';
  scheduled_time: string;
  drawing_time: string;
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

interface SchedulerStatus {
  status: 'running' | 'stopped';
  tasks: ScheduledTask[];
  recentLogs: TaskLog[];
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
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- API Call Functions ---
  const fetchSchedulerStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/scheduler?action=status');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSchedulerStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const schedulerAction = async (action: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    try {
      setLoading(true);
      const url = action.startsWith('run_task') ? '/api/scheduler' : `/api/scheduler?action=${action}`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setTimeout(fetchSchedulerStatus, 1000); // Refresh after action
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchSchedulerStatus();
    const interval = setInterval(fetchSchedulerStatus, 30000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  // --- Data Processing & Memoization ---
  const summaryCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    if (!schedulerStatus?.tasks) return counts;
    schedulerStatus.tasks.forEach(task => {
      counts.all++;
      if (counts[task.status as StatusFilter] !== undefined) {
        counts[task.status as StatusFilter]++;
      }
    });
    return counts;
  }, [schedulerStatus?.tasks]);

  const groupedAndFilteredTasks = useMemo(() => {
    if (!schedulerStatus?.tasks) return {};
    
    const filtered = schedulerStatus.tasks.filter(task => {
      const statusMatch = statusFilter === 'all' || task.status === statusFilter;
      const searchMatch = searchTerm === '' || task.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });

    return filtered.reduce((acc, task) => {
      const key = task.drawing_time;
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
  }, [schedulerStatus?.tasks, statusFilter, searchTerm]);


  if (loading && !schedulerStatus) {
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50">Scheduler Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">จัดการและตรวจสอบระบบ Scheduler อัตโนมัติ</p>
          </div>
          <Button onClick={fetchSchedulerStatus} disabled={refreshing} variant="outline" className="mt-4 md:mt-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>เกิดข้อผิดพลาด: {error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- Left Column --- */}
          <div className="lg:col-span-1 space-y-6">
            {/* Control Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 animate-pulse ${schedulerStatus?.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                  สถานะ: {schedulerStatus?.status === 'running' ? 'กำลังทำงาน' : 'หยุดทำงาน'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2">
                {schedulerStatus?.status === 'running' ? (
                  <>
                    <Button onClick={() => schedulerAction('stop')} disabled={loading} variant="destructive">
                      <Square className="w-4 h-4 mr-2" /> หยุด Scheduler
                    </Button>
                    <Button onClick={() => schedulerAction('process')} disabled={refreshing} variant="outline">
                      <Play className="w-4 h-4 mr-2" /> รัน Tasks ที่ค้างทันที
                    </Button>
                    <Button onClick={() => schedulerAction('update_schedules', 'POST')} disabled={refreshing} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" /> อัปเดต Schedules จาก DB
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => schedulerAction('init')} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" /> เริ่ม Scheduler
                  </Button>
                )}
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
          </div>

          {/* --- Right Column --- */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks">Scheduled Tasks ({summaryCounts.all})</TabsTrigger>
                <TabsTrigger value="logs">Recent Logs ({schedulerStatus?.recentLogs?.length || 0})</TabsTrigger>
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
                                      <Button size="sm" variant="ghost" onClick={() => schedulerAction('run_task', 'POST', { taskId: task.id })} disabled={loading || task.status === 'running'}>
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
                    {schedulerStatus?.recentLogs && schedulerStatus.recentLogs.length > 0 ? (
                      <Table>
                         <TableHeader>
                           <TableRow>
                              <TableHead>Task</TableHead>
                              <TableHead>สถานะ</TableHead>
                              <TableHead>เวลาที่รัน</TableHead>
                              <TableHead>ข้อผิดพลาด</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {schedulerStatus.recentLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell className="font-medium">{log.task_name}</TableCell>
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