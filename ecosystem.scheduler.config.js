module.exports = {
  apps: [
    {
      name: 'huaylotto-scheduler',
      script: 'scripts/start-scheduler-linux.sh',
      cwd: '/root/huaylotto',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_file: '.env.production',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_file: './logs/scheduler-combined.log',
      time: true,
      kill_timeout: 10000,
      restart_delay: 5000
    }
  ]
}; 