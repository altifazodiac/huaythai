# Linux VPS Deployment Guide

## Server Information
- **IP Address**: 119.59.102.145
- **SSH Access**: `ssh root@119.59.102.145`
- **OS**: Linux (Cloud VPS)

## Prerequisites Installation

### 1. Install Node.js and Bun
```bash
# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 2. Install PM2 for Process Management
```bash
npm install -g pm2
```

### 3. Install Required System Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl wget build-essential
```

## Project Deployment

### 1. Clone and Setup Project

**Option A: If repository already exists (Update existing code):**
```bash
# Navigate to existing project
cd /root/huaylotto

# Update with latest code
git pull origin main

# Install dependencies
bun install
```

**Option B: If repository doesn't exist (Clone new):**
```bash
# Clone the project (or upload via FTP/SCP)
cd /root
git clone <your-repository-url> huaylotto
cd huaylotto

# Install dependencies
bun install
```

### 2. Environment Setup
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

**Required Environment Variables:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token

# Internal API Security
INTERNAL_API_KEY=your_secure_random_key_here

# Next.js Configuration
NODE_ENV=production
```

### 3. Database Migration
```bash
# Run Supabase migrations
bun run supabase db push

# Or if using direct SQL
# Execute the migration file in your Supabase dashboard
```

### 4. Build Application
```bash
# Build Next.js application
bun run build
```

## Scheduler System Setup

### 1. Create PM2 Ecosystem File
```bash
# Create PM2 configuration
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
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
      time: true
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
      time: true
    }
  ]
};
```

### 2. Create Logs Directory
```bash
mkdir -p /root/huaylotto/logs
```

### 3. Start Services
```bash
# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd
# Follow the command it gives you to run with sudo
```

## Nginx Configuration (Optional)

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/huaylotto
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name 119.59.102.145;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/huaylotto /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## System Monitoring

### 1. Check Service Status
```bash
# Check PM2 processes
pm2 status

# Check specific logs
pm2 logs huaylotto-web
pm2 logs huaylotto-scheduler

# Check system resources
pm2 monit
```

### 2. View Scheduler Status
```bash
# Access the web interface
http://119.59.102.145/admin/task-manager

# Or check logs directly
tail -f /root/huaylotto/logs/scheduler-combined.log
```

## Maintenance Commands

### 1. Update Application
```bash
cd /root/huaylotto
git pull origin main
bun install
bun run build
pm2 restart all
```

### 2. Restart Services
```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart huaylotto-scheduler
pm2 restart huaylotto-web
```

### 3. View Logs
```bash
# Real-time logs
pm2 logs --lines 50

# Specific service logs
pm2 logs huaylotto-scheduler --lines 100
```

## Security Considerations

### 1. Firewall Setup
```bash
# Allow SSH and HTTP
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Secure Environment Variables
```bash
# Ensure proper file permissions
chmod 600 .env.production
chown root:root .env.production
```

### 3. Regular Updates
```bash
# Setup automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### 1. Common Issues
- **Port 3000 already in use**: Check and kill existing processes
- **Permission denied**: Ensure proper file permissions
- **Environment variables not loaded**: Check .env.production file

### 2. Debug Commands
```bash
# Check if ports are listening
netstat -tulpn | grep :3000

# Check application logs
tail -f /root/huaylotto/logs/web-combined.log

# Check scheduler logs
tail -f /root/huaylotto/logs/scheduler-combined.log
```

### 3. Manual Scheduler Test
```bash
# Test scheduler API directly
curl -X POST http://localhost:3000/api/scheduler/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

## Backup and Recovery

### 1. Database Backup
```bash
# Your Supabase data is automatically backed up
# Create additional backups via Supabase dashboard
```

### 2. Application Backup
```bash
# Create backup script
nano /root/backup-huaylotto.sh
```

**backup-huaylotto.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/huaylotto"
APP_DIR="/root/huaylotto"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/huaylotto_$DATE.tar.gz -C /root huaylotto
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /root/backup-huaylotto.sh
crontab -e
# Add: 0 2 * * * /root/backup-huaylotto.sh
```

## Performance Optimization

### 1. System Tuning
```bash
# Increase file limits
echo "fs.file-max = 65536" >> /etc/sysctl.conf
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
sysctl -p
```

### 2. Application Optimization
```bash
# Enable PM2 cluster mode for web app if needed
pm2 delete huaylotto-web
pm2 start ecosystem.config.js --only huaylotto-web
```

---

## Quick Start Commands

### For New Repository:
```bash
# Complete deployment in one go
ssh root@119.59.102.145
cd /root && git clone <repo> huaylotto && cd huaylotto
chmod +x deploy.sh && ./deploy.sh --initial
```

### For Existing Repository:
```bash
# Update existing deployment
ssh root@119.59.102.145
cd /root/huaylotto && git pull origin main
chmod +x deploy.sh && ./deploy.sh --update
```

### Manual Setup (if you prefer):
```bash
# Manual deployment steps
ssh root@119.59.102.145
cd /root/huaylotto  # or clone first if needed
bun install && bun run build
cp .env.example .env.production && nano .env.production
pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd
```

**Access your application at**: http://119.59.102.145
**Admin Panel**: http://119.59.102.145/admin/task-manager 