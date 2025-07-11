module.exports = {
  apps: [
    {
      name: 'huaylotto-web',
      script: 'bun',
      args: 'run start',
      cwd: '/root/huaylotto',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env', // เปลี่ยนเป็น .env ถ้าใช้ไฟล์นี้
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true,
      kill_timeout: 5000,
      restart_delay: 5000
    },
    {
      name: 'huaylotto-scheduler',
      script: 'scripts/scheduler.ts',
      interpreter: 'bun',
      cwd: '/root/huaylotto',
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env', // ให้ scheduler โหลด .env เช่นกัน
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_file: './logs/scheduler-combined.log',
      time: true,
      kill_timeout: 5000,
      restart_delay: 5000,
      cron_restart: '0 0 * * *'
    }
  ]
}; 