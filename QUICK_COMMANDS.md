# Quick Commands Reference

## 🚀 Initial Deployment

### Scenario 1: Repository Already Exists on VPS
```bash
ssh root@119.59.102.145
cd /root/huaylotto
git pull origin main
chmod +x deploy.sh
./deploy.sh --initial
```

### Scenario 2: Fresh Installation (Clone Repository)
```bash
ssh root@119.59.102.145
cd /root
git clone <your-repo-url> huaylotto
cd huaylotto
chmod +x deploy.sh
./deploy.sh --initial
```

## 🔄 Regular Updates

### Update Application Code
```bash
ssh root@119.59.102.145
cd /root/huaylotto
./deploy.sh --update
```

### Manual Update Process
```bash
ssh root@119.59.102.145
cd /root/huaylotto
git pull origin main
bun install
bun run build
pm2 restart all
```

## 🔍 System Monitoring

### Check Status
```bash
ssh root@119.59.102.145
cd /root/huaylotto
./deploy.sh --status
```

### Check PM2 Processes
```bash
ssh root@119.59.102.145
pm2 status
pm2 logs
```

### Check Specific Service Logs
```bash
ssh root@119.59.102.145
pm2 logs huaylotto-web
pm2 logs huaylotto-scheduler
```

### Check Real-time Logs
```bash
ssh root@119.59.102.145
tail -f /root/huaylotto/logs/web-combined.log
tail -f /root/huaylotto/logs/scheduler-combined.log
```

## 🛠️ Maintenance Commands

### Restart Services
```bash
ssh root@119.59.102.145
cd /root/huaylotto
./deploy.sh --restart
```

### Restart Individual Services
```bash
ssh root@119.59.102.145
pm2 restart huaylotto-web
pm2 restart huaylotto-scheduler
```

### Create Backup
```bash
ssh root@119.59.102.145
cd /root/huaylotto
./deploy.sh --backup
```

## 🔧 Environment & Configuration

### Edit Environment Variables
```bash
ssh root@119.59.102.145
cd /root/huaylotto
nano .env.production
pm2 restart all  # Apply changes
```

### Edit PM2 Configuration
```bash
ssh root@119.59.102.145
cd /root/huaylotto
nano ecosystem.config.js
pm2 reload ecosystem.config.js
```

## 🚨 Troubleshooting

### Check if App is Running
```bash
ssh root@119.59.102.145
netstat -tulpn | grep :3000
curl -I http://localhost:3000
```

### Check System Resources
```bash
ssh root@119.59.102.145
htop  # or top
df -h  # disk usage
free -h  # memory usage
```

### Check Nginx Status
```bash
ssh root@119.59.102.145
systemctl status nginx
nginx -t  # test configuration
```

### Check Firewall
```bash
ssh root@119.59.102.145
ufw status
```

## 🔐 Security Commands

### Change File Permissions
```bash
ssh root@119.59.102.145
cd /root/huaylotto
chmod 600 .env.production
chmod +x deploy.sh
chmod +x scripts/*.sh
```

### Update System Packages
```bash
ssh root@119.59.102.145
apt update && apt upgrade -y
```

## 🧪 Testing Commands

### Test Scheduler API
```bash
ssh root@119.59.102.145
curl -X GET http://localhost:3000/api/scheduler/status \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

### Test Import Lottery Results
```bash
ssh root@119.59.102.145
curl -X POST http://localhost:3000/api/import-lottery-results \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

### Test Send Results
```bash
ssh root@119.59.102.145
curl -X POST http://localhost:3000/api/send-lottery-results \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

## 📊 Database Operations

### Check Database Connection
```bash
# Access via Supabase dashboard or CLI
# Check scheduled_tasks table
# Check task_logs table
```

### Run Database Migration
```bash
# Execute SQL in Supabase dashboard:
# supabase/migrations/20250101000000_create_scheduler_tables.sql
```

## 🔄 Complete System Reset

### Stop All Services
```bash
ssh root@119.59.102.145
pm2 stop all
pm2 delete all
```

### Restart Everything
```bash
ssh root@119.59.102.145
cd /root/huaylotto
pm2 start ecosystem.config.js
pm2 save
```

## 📱 Access URLs

- **Main Application**: http://119.59.102.145
- **Admin Panel**: http://119.59.102.145/admin/task-manager
- **API Documentation**: http://119.59.102.145/api/swagger

## 🆘 Emergency Commands

### Kill All Node Processes
```bash
ssh root@119.59.102.145
pkill -f node
pkill -f bun
```

### Restart Server
```bash
ssh root@119.59.102.145
reboot
```

### Check System Boot Logs
```bash
ssh root@119.59.102.145
journalctl -u pm2-root
systemctl status pm2-root
```

---

## 📋 Common Issues & Solutions

### Port 3000 Already in Use
```bash
ssh root@119.59.102.145
netstat -tulpn | grep :3000
kill -9 <PID>
```

### PM2 Not Starting on Boot
```bash
ssh root@119.59.102.145
pm2 startup systemd
# Follow the command it outputs
pm2 save
```

### Environment Variables Not Loading
```bash
ssh root@119.59.102.145
cd /root/huaylotto
ls -la .env.production
cat .env.production  # Check if file exists and has content
```

### Git Permission Issues
```bash
ssh root@119.59.102.145
cd /root/huaylotto
git config --global --add safe.directory /root/huaylotto
``` 