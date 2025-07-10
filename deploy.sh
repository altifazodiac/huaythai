#!/bin/bash

# HuayLotto Linux VPS Deployment Script
# Usage: ./deploy.sh [--initial] [--update] [--restart]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="huaylotto"
APP_DIR="/root/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_DIR="$APP_DIR/logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (use sudo)"
        exit 1
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$APP_DIR" ]; then
        DATE=$(date +%Y%m%d_%H%M%S)
        tar -czf "$BACKUP_DIR/${APP_NAME}_$DATE.tar.gz" -C "/root" "$APP_NAME"
        log_success "Backup created: $BACKUP_DIR/${APP_NAME}_$DATE.tar.gz"
        
        # Keep only last 5 backups
        cd "$BACKUP_DIR"
        ls -t ${APP_NAME}_*.tar.gz | tail -n +6 | xargs -r rm --
    fi
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install required packages
    apt install -y git curl wget build-essential nginx ufw
    
    # Install Node.js
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install Bun
    if ! command -v bun &> /dev/null; then
        curl -fsSL https://bun.sh/install | bash
        source ~/.bashrc
        export PATH="$PATH:$HOME/.bun/bin"
    fi
    
    # Install PM2
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    log_success "System dependencies installed"
}

# Setup application
setup_app() {
    log_info "Setting up application..."
    
    # Check if app directory exists and is a git repository
    if [ -d "$APP_DIR" ] && [ -d "$APP_DIR/.git" ]; then
        log_info "Git repository found. Updating existing code..."
        cd "$APP_DIR"
        git pull origin main
        log_success "Code updated from repository"
    else
        log_info "No git repository found. Please clone your repository first."
        log_warning "Run: cd /root && git clone <your-repo-url> huaylotto"
        log_warning "Or if you want to continue with existing files, remove .git requirement"
        
        # Create app directory if it doesn't exist
        mkdir -p "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    # Install dependencies
    if [ -f "package.json" ]; then
        log_info "Installing Node.js dependencies..."
        bun install
        log_success "Dependencies installed"
    else
        log_error "package.json not found!"
        exit 1
    fi
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Setup environment file
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.example" ]; then
            cp ".env.example" ".env.production"
            log_warning "Created .env.production from .env.example"
            log_warning "Please edit .env.production with your actual values"
        else
            log_error ".env.example not found!"
            exit 1
        fi
    fi
    
    # Build application
    log_info "Building application..."
    bun run build
    log_success "Application built"
}

# Setup services
setup_services() {
    log_info "Setting up services..."
    
    # Stop existing services
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start services
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup startup script
    pm2 startup systemd -u root --hp /root
    
    log_success "Services configured"
}

# Setup nginx
setup_nginx() {
    log_info "Setting up Nginx..."
    
    # Create nginx configuration
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name 119.59.102.145;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart nginx
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx configured"
}

# Setup firewall
setup_firewall() {
    log_info "Setting up firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    log_success "Firewall configured"
}

# Update application
update_app() {
    log_info "Updating application..."
    
    cd "$APP_DIR"
    
    # Create backup first
    create_backup
    
    # Pull latest code
    git pull origin main
    
    # Update dependencies
    bun install
    
    # Build application
    bun run build
    
    # Restart services
    pm2 restart all
    
    log_success "Application updated"
}

# Show status
show_status() {
    log_info "System Status:"
    echo "=================="
    
    # PM2 status
    pm2 status
    
    # Nginx status
    echo ""
    log_info "Nginx Status:"
    systemctl status nginx --no-pager -l
    
    # Disk usage
    echo ""
    log_info "Disk Usage:"
    df -h
    
    # Memory usage
    echo ""
    log_info "Memory Usage:"
    free -h
    
    # Process monitoring
    echo ""
    log_info "Application URLs:"
    echo "Main App: http://119.59.102.145"
    echo "Admin Panel: http://119.59.102.145/admin/task-manager"
}

# Main script
main() {
    check_root
    
    case "$1" in
        --initial)
            log_info "Starting initial deployment..."
            install_dependencies
            setup_app
            setup_services
            setup_nginx
            setup_firewall
            show_status
            log_success "Initial deployment completed!"
            ;;
        --update)
            log_info "Starting application update..."
            update_app
            show_status
            log_success "Application update completed!"
            ;;
        --restart)
            log_info "Restarting services..."
            pm2 restart all
            systemctl restart nginx
            show_status
            log_success "Services restarted!"
            ;;
        --status)
            show_status
            ;;
        --backup)
            create_backup
            ;;
        *)
            echo "Usage: $0 [--initial|--update|--restart|--status|--backup]"
            echo ""
            echo "Options:"
            echo "  --initial   Complete initial deployment"
            echo "  --update    Update existing application"
            echo "  --restart   Restart all services"
            echo "  --status    Show system status"
            echo "  --backup    Create backup"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 