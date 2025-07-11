module.exports = {
  apps: [
    {
      name: 'lottery-background-processor',
      script: './scripts/start-background-processor.ts',
      interpreter: 'bun',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Bangkok'
      },
      env_production: {
        NODE_ENV: 'production',
        TZ: 'Asia/Bangkok'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/background-processor-out.log',
      error_file: './logs/background-processor-error.log',
      combine_logs: true,
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      kill_timeout: 5000
    }
  ]
}; 