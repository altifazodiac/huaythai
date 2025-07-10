'use client';

import { useEffect, useState } from 'react';

export function SchedulerInitializer() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // เริ่มต้น scheduler หลังจาก app load เสร็จ
    const initializeScheduler = async () => {
      // ตรวจสอบว่าอยู่ใน production environment หรือไม่
      const isProduction = process.env.NODE_ENV === 'production';
      
      // ใน development ให้รอสักครู่ก่อนเริ่มต้น
      if (!isProduction) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (isInitializing || isInitialized) return;

      setIsInitializing(true);

      try {
        console.log('🚀 Initializing scheduler...');
        
        // ตรวจสอบสถานะ scheduler ก่อน
        const statusResponse = await fetch('/api/scheduler?action=status', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        
        // ถ้า scheduler ยังไม่ทำงาน ให้เริ่มต้น
        if (statusData.status !== 'running') {
          console.log('📅 Scheduler not running, initializing...');
          
          const initResponse = await fetch('/api/scheduler?action=init', {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          if (!initResponse.ok) {
            throw new Error(`Initialization failed: ${initResponse.status}`);
          }

          const initData = await initResponse.json();
          console.log('✅ Scheduler initialized successfully:', initData.message);
        } else {
          console.log('✅ Scheduler already running');
        }

        setIsInitialized(true);

      } catch (error) {
        console.error('❌ Failed to initialize scheduler:', error);
        
        // ถ้าเป็น development หรือมี fallback ให้ลองใหม่หลัง 30 วินาที
        if (!isProduction) {
          setTimeout(() => {
            setIsInitializing(false);
            initializeScheduler();
          }, 30000);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    // เริ่มต้น scheduler หลังจาก component mount
    const timer = setTimeout(initializeScheduler, 2000);

    return () => clearTimeout(timer);
  }, [isInitializing, isInitialized]);

  // Component นี้ไม่แสดงอะไรในหน้าเว็บ
  return null;
} 