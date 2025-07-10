'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Square, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

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

export default function TaskManagerPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ดึงข้อมูลสถานะ scheduler
  const fetchSchedulerStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/scheduler?action=status');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSchedulerStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching scheduler status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // เริ่มต้น scheduler
  const initializeScheduler = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduler?action=init');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchSchedulerStatus();
    } catch (err) {
      console.error('Error initializing scheduler:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // หยุด scheduler
  const stopScheduler = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduler?action=stop');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchSchedulerStatus();
    } catch (err) {
      console.error('Error stopping scheduler:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // ประมวลผล pending tasks ทันที
  const processPendingTasks = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/scheduler?action=process');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // รอสักหน่อยแล้วดึงข้อมูลใหม่
      setTimeout(() => {
        fetchSchedulerStatus();
      }, 2000);
    } catch (err) {
      console.error('Error processing pending tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  // อัปเดต scheduled tasks
  const updateScheduledTasks = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update_schedules' }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchSchedulerStatus();
    } catch (err) {
      console.error('Error updating scheduled tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  // รัน task เฉพาะ
  const runSpecificTask = async (taskId: string) => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run_task', taskId }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // รอสักหน่อยแล้วดึงข้อมูลใหม่
      setTimeout(() => {
        fetchSchedulerStatus();
      }, 2000);
    } catch (err) {
      console.error('Error running specific task:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  // ฟังก์ชันสำหรับจัดรูปแบบเวลา
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ฟังก์ชันสำหรับ get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'รอ' },
      running: { color: 'bg-blue-500', icon: RefreshCw, text: 'กำลังรัน' },
      completed: { color: 'bg-green-500', icon: CheckCircle, text: 'สำเร็จ' },
      failed: { color: 'bg-red-500', icon: XCircle, text: 'ผิดพลาด' },
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

  // ฟังก์ชันสำหรับ get task type badge
  const getTaskTypeBadge = (type: string) => {
    const typeConfig = {
      scrape: { color: 'bg-blue-600', text: 'สครีป' },
      send: { color: 'bg-green-600', text: 'ส่ง' },
      cleanup: { color: 'bg-gray-600', text: 'ทำความสะอาด' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'bg-gray-600', text: type };

    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  // ดึงข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchSchedulerStatus();
    
    // ตั้ง interval สำหรับ auto refresh ทุก 30 วินาที
    const interval = setInterval(fetchSchedulerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !schedulerStatus) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Manager</h1>
          <p className="text-gray-600">จัดการและตรวจสอบระบบ Scheduler อัตโนมัติ</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchSchedulerStatus}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            เกิดข้อผิดพลาด: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Scheduler Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              schedulerStatus?.status === 'running' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            สถานะ Scheduler
          </CardTitle>
          <CardDescription>
            ระบบ Scheduler ปัจจุบัน: {schedulerStatus?.status === 'running' ? 'กำลังทำงาน' : 'หยุดทำงาน'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {schedulerStatus?.status === 'running' ? (
              <>
                <Button
                  onClick={stopScheduler}
                  disabled={loading}
                  variant="destructive"
                >
                  <Square className="w-4 h-4 mr-2" />
                  หยุด Scheduler
                </Button>
                <Button
                  onClick={processPendingTasks}
                  disabled={refreshing}
                  variant="outline"
                >
                  <Play className="w-4 h-4 mr-2" />
                  รัน Tasks ทันที
                </Button>
                <Button
                  onClick={updateScheduledTasks}
                  disabled={refreshing}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  อัปเดต Schedules
                </Button>
              </>
            ) : (
              <Button
                onClick={initializeScheduler}
                disabled={loading}
                variant="default"
              >
                <Play className="w-4 h-4 mr-2" />
                เริ่ม Scheduler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks and Logs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">
            Scheduled Tasks ({schedulerStatus?.tasks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="logs">
            Recent Logs ({schedulerStatus?.recentLogs?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Tasks</CardTitle>
              <CardDescription>
                รายการ Tasks ที่กำหนดเวลาไว้ในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulerStatus?.tasks && schedulerStatus.tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ Task</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>เวลากำหนด</TableHead>
                      <TableHead>เวลาออกหวย</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>รันครั้งต่อไป</TableHead>
                      <TableHead>รันครั้งล่าสุด</TableHead>
                      <TableHead>การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulerStatus.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.name}
                        </TableCell>
                        <TableCell>
                          {getTaskTypeBadge(task.type)}
                        </TableCell>
                        <TableCell>{task.scheduled_time}</TableCell>
                        <TableCell>{task.drawing_time}</TableCell>
                        <TableCell>
                          {getStatusBadge(task.status)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(task.next_run)}
                        </TableCell>
                        <TableCell>
                          {task.last_run ? formatDateTime(task.last_run) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runSpecificTask(task.id)}
                            disabled={refreshing || task.status === 'running'}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            รันทันที
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  ไม่มี Scheduled Tasks
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>
                ประวัติการทำงานของ Tasks ล่าสุด (10 รายการ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulerStatus?.recentLogs && schedulerStatus.recentLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ Task</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>เวลาที่รัน</TableHead>
                      <TableHead>ข้อผิดพลาด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulerStatus.recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.task_name}
                        </TableCell>
                        <TableCell>
                          {getTaskTypeBadge(log.task_type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(log.execution_time)}
                        </TableCell>
                        <TableCell>
                          {log.error_message ? (
                            <span className="text-red-600 text-sm">
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  ไม่มี Logs
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 