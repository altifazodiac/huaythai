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
      env_file: '.env.local', // แนะนำให้ใช้ .env.local เพื่อความปลอดภัย
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
    }
    // huaylotto-scheduler ถูกลบออกแล้ว
    // เนื่องจากเราใช้ System Cron ของ Linux ผ่าน setup-dynamic-cron.ts
    // ซึ่งเป็นวิธีที่เสถียรและเหมาะสมกว่าสำหรับ VPS
  ]
}; 