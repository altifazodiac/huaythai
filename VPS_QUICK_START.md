# VPS Quick Start Guide

## 🚀 One-Command Deployment

```bash
# SSH to your VPS
ssh root@119.59.102.145

# Clone and setup
cd /var/www && git clone <your-repo-url> huaylotto && cd huaylotto

# Make deploy script executable
chmod +x deploy.sh

# Run initial deployment
./deploy.sh --initial
```

## 📋 Environment Variables Required

Create `.env.production` file with these variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# Internal API Security (Generate a strong random key)
INTERNAL_API_KEY=your-secure-random-key-here

# Next.js Configuration
NODE_ENV=production
PORT=3000
```

## 🔧 Manual Step-by-Step

### 1. Initial Setup
```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y git curl wget build-essential nginx ufw

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2
npm install -g pm2
```

### 2. Application Setup
```bash
# Clone project
cd /var/www
git clone <your-repo-url> huaylotto
cd huaylotto

# Install dependencies
bun install

# Create environment file
cp .env.example .env.production
nano .env.production  # Edit with your values

# Build application
bun run build

# Create logs directory
mkdir -p logs
```

### 3. Database Setup
```bash
# Apply database migrations
# Run this SQL in your Supabase dashboard:
# Execute the contents of: supabase/migrations/20250101000000_create_scheduler_tables.sql
```

### 4. Start Services
```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

### 5. Setup Nginx
```bash
# Create nginx config
cat > /etc/nginx/sites-available/huaylotto << 'EOF'
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
EOF

# Enable site
ln -s /etc/nginx/sites-available/huaylotto /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 6. Setup Firewall
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 🎯 Access Your Application

- **Main App**: http://119.59.102.145
- **Admin Panel**: http://119.59.102.145/admin/task-manager
- **API Docs**: http://119.59.102.145/api/swagger

## 🔍 Monitoring Commands

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs

# View specific service logs
pm2 logs huaylotto-web
pm2 logs huaylotto-scheduler

# System status
./deploy.sh --status
```

## 🔄 Update Application

```bash
# Simple update
./deploy.sh --update

# Or manual update
cd /var/www/huaylotto
git pull origin main
bun install
bun run build
pm2 restart all
```

## 🆘 Troubleshooting

### Check if services are running
```bash
pm2 status
netstat -tulpn | grep :3000
```

### Check logs
```bash
tail -f /var/www/huaylotto/logs/web-combined.log
tail -f /var/www/huaylotto/logs/scheduler-combined.log
```

### Restart services
```bash
./deploy.sh --restart
```

### Test scheduler API
```bash
curl -X GET http://localhost:3000/api/scheduler/status \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

## 📊 Scheduler Features

The new scheduler system will:
- ✅ Auto-scrape lottery results after drawing time
- ✅ Send LINE notifications to users
- ✅ Clean up old logs automatically
- ✅ Work on Linux without cron jobs
- ✅ Provide web-based monitoring
- ✅ Handle errors gracefully

## 🛡️ Security Notes

- Change default passwords
- Use strong INTERNAL_API_KEY
- Keep environment variables secure
- Regular security updates
- Monitor logs for suspicious activity

## 📞 Support

If you encounter issues:
1. Check logs: `pm2 logs`
2. Check system status: `./deploy.sh --status`
3. Restart services: `./deploy.sh --restart` 