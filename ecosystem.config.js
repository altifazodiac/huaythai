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
      env_file: '.env.production',
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
      script: 'scripts/start-scheduler-linux.sh',
      cwd: '/root/huaylotto',
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