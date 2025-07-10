# Fix Git Merge Conflict

## 🚨 Current Issue
```
error: Your local changes to the following files would be overwritten by merge:
        components/LotteryNotificationToast.tsx
        setup-dynamic-cron.ts
Please commit your changes or stash them before you merge.
Aborting
```

## 🛠️ Solution Steps

### Step 1: Check Current Changes
```bash
cd /root/huaylotto
git status
git diff
```

### Step 2: Choose Resolution Method

#### Option A: Discard Local Changes (Recommended)
```bash
# Reset to match remote repository
git reset --hard HEAD

# Pull latest changes
git pull origin main

# Continue with deployment
chmod +x deploy.sh
./deploy.sh --update
```

#### Option B: Save Local Changes First
```bash
# Save current changes
git stash push -m "Local changes before update"

# Pull latest changes
git pull origin main

# View saved changes (if needed later)
git stash list
git stash show -p stash@{0}

# Apply saved changes back (if needed)
git stash pop

# Continue with deployment
chmod +x deploy.sh
./deploy.sh --update
```

#### Option C: Commit Local Changes
```bash
# Add and commit current changes
git add .
git commit -m "Local modifications before update"

# Pull latest changes (may create merge commit)
git pull origin main

# Continue with deployment
chmod +x deploy.sh
./deploy.sh --update
```

## 🎯 Quick Fix Commands

### For Production (Recommended)
```bash
ssh root@119.59.102.145
cd /root/huaylotto

# Discard local changes and update
git reset --hard HEAD
git pull origin main

# Deploy updated code
chmod +x deploy.sh
./deploy.sh --update
```

### Alternative: Safe Update
```bash
ssh root@119.59.102.145
cd /root/huaylotto

# Save local changes
git stash push -m "Before update $(date)"

# Update code
git pull origin main

# Deploy
chmod +x deploy.sh
./deploy.sh --update
```

## 📊 Understanding the Conflict

### Files in Conflict:
1. **components/LotteryNotificationToast.tsx** - UI component
2. **setup-dynamic-cron.ts** - Old cron system (replaced by new scheduler)

### Why This Happens:
- Local files were modified
- Remote repository has newer versions
- Git cannot automatically merge differences

## 🔧 After Resolution

### Verify Update Success:
```bash
# Check git status
git status

# Check latest commit
git log --oneline -5

# Verify services are running
pm2 status

# Check application
curl -I http://localhost:3000
```

### Monitor Application:
```bash
# Check logs
pm2 logs

# Check scheduler status
curl -X GET http://localhost:3000/api/scheduler/status \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

## 🆘 If Something Goes Wrong

### Restore from Backup:
```bash
# Check available backups
ls -la /var/backups/huaylotto/

# Restore if needed
cd /root
tar -xzf /var/backups/huaylotto/huaylotto_YYYYMMDD_HHMMSS.tar.gz
```

### Reset to Known Good State:
```bash
# Hard reset to specific commit
git reset --hard <commit-hash>

# Or reset to remote main
git reset --hard origin/main
```

## 📋 Prevention for Future

### Before Each Update:
```bash
# Check for local changes
git status

# If clean, proceed with update
git pull origin main

# If dirty, choose resolution method first
```

### Use Deploy Script:
```bash
# The deploy script handles this automatically
./deploy.sh --update
```

## 🔍 Debug Commands

### Check Repository Status:
```bash
# Current branch and status
git branch -v
git status --porcelain

# Check remote
git remote -v
git fetch origin
git log --oneline origin/main..HEAD
```

### Check File Differences:
```bash
# See what changed locally
git diff HEAD

# See specific file changes
git diff HEAD -- components/LotteryNotificationToast.tsx
git diff HEAD -- setup-dynamic-cron.ts
```

---

## 🎯 Most Common Solution

For production deployments, the safest approach is usually:

```bash
cd /root/huaylotto
git reset --hard HEAD
git pull origin main
./deploy.sh --update
```

This ensures you always have the latest code without conflicts. 