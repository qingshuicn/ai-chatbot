# AI 聊天机器人 Ubuntu 服务器部署指南

本文档提供了在 Ubuntu 服务器上部署 AI 聊天机器人的详细步骤。

## 目录

- [1. 服务器准备](#1-服务器准备)
- [2. 安装 Node.js 和 PNPM](#2-安装-nodejs-和-pnpm)
- [3. 安装 PostgreSQL 数据库](#3-安装-postgresql-数据库)
- [4. 部署应用程序](#4-部署应用程序)
- [5. 配置 PM2 进程管理](#5-配置-pm2-进程管理)
- [6. 配置 Nginx 反向代理](#6-配置-nginx-反向代理)
- [7. 配置防火墙](#7-配置防火墙)
- [8. 维护和更新](#8-维护和更新)
- [9. 故障排除](#9-故障排除)
- [10. 安全建议](#10-安全建议)

## 1. 服务器准备

### 1.1 系统要求

- Ubuntu 20.04 LTS 或更高版本
- 至少 2GB RAM (推荐 4GB+)
- 至少 20GB 可用磁盘空间
- 公网 IP 或域名（用于访问）

### 1.2 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 安装基础依赖

```bash
sudo apt install -y git curl wget build-essential
```

## 2. 安装 Node.js 和 PNPM

### 2.1 安装 Node.js

```bash
# 安装 Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 2.2 安装 PNPM

```bash
# 安装 PNPM
npm install -g pnpm

# 验证安装
pnpm -v
```

## 3. 安装 PostgreSQL 数据库

### 3.1 安装 PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 3.2 配置数据库

```bash
# 切换到 postgres 用户
sudo -i -u postgres

# 创建数据库用户
psql -c "CREATE USER aichatbot WITH PASSWORD '设置一个强密码';"

# 创建数据库
psql -c "CREATE DATABASE aichatbot;"

# 将数据库所有权更改为 aichatbot 用户
psql -c "ALTER DATABASE aichatbot OWNER TO aichatbot;"

# 授予所有权限
psql -c "GRANT ALL PRIVILEGES ON DATABASE aichatbot TO aichatbot;"

# 连接到 aichatbot 数据库并授予架构权限
psql -d aichatbot -c "GRANT ALL ON SCHEMA public TO aichatbot;"
psql -d aichatbot -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO aichatbot;"
psql -d aichatbot -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO aichatbot;"
psql -d aichatbot -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO aichatbot;"

# 退出 postgres 用户
exit
```

### 3.3 修改 PostgreSQL 认证配置

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

找到这一行：
```
local   all             all                                     peer
```

将其修改为：
```
local   all             all                                     md5
```

重启 PostgreSQL 服务：
```bash
sudo systemctl restart postgresql
```

### 3.4 测试数据库连接

```bash
psql -U aichatbot -d aichatbot -h localhost
# 输入密码后应该能成功连接
```

### 3.5 获取数据库连接字符串

记下以下格式的连接字符串，稍后将用于环境变量：
```
postgres://aichatbot:密码@localhost:5432/aichatbot
```

## 4. 部署应用程序

### 4.1 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www

# 克隆代码仓库
git clone https://github.com/你的用户名/ai-chatbot.git
cd ai-chatbot
```

### 4.2 安装依赖

```bash
pnpm install
```

### 4.3 创建环境变量文件

```bash
cp .env.example .env.local
nano .env.local
```

填入以下内容：
```
# AI 模型 API 密钥
OPENAI_API_KEY=你的OpenAI密钥
FIREWORKS_API_KEY=你的Fireworks密钥
DASHSCOPE_TOKEN=你的阿里云DashScope令牌

# 认证相关
AUTH_SECRET=生成一个随机密钥，可以用: openssl rand -base64 32

# 数据库
POSTGRES_URL=postgres://aichatbot:密码@localhost:5432/aichatbot
```

### 4.4 运行数据库迁移

```bash
pnpm run db:migrate
```

### 4.5 构建应用

```bash
pnpm run build
```

## 5. 配置 PM2 进程管理

### 5.1 安装 PM2

```bash
npm install -g pm2
```

### 5.2 创建 PM2 配置文件

```bash
nano ecosystem.config.js
```

填入以下内容：
```javascript
module.exports = {
  apps: [
    {
      name: 'ai-chatbot',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### 5.3 启动应用

```bash
pm2 start ecosystem.config.js
```

### 5.4 设置开机自启

```bash
pm2 startup
# 执行命令输出的指令
pm2 save
```

## 6. 配置 Nginx 反向代理

### 6.1 安装 Nginx

```bash
sudo apt install -y nginx
```

### 6.2 配置 SSL 证书（推荐）

安装 Certbot：
```bash
sudo apt install -y certbot python3-certbot-nginx
```

获取 SSL 证书（替换为你的域名）：
```bash
sudo certbot --nginx -d 你的域名.com
```

### 6.3 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/ai-chatbot
```

填入以下内容（替换为你的域名）：
```nginx
server {
    listen 80;
    server_name 你的域名.com;
    
    # 重定向 HTTP 到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name 你的域名.com;
    
    # SSL 配置（如果使用 Certbot，这部分会自动配置）
    ssl_certificate /etc/letsencrypt/live/你的域名.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名.com/privkey.pem;
    
    # 代理设置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 文件上传限制
        client_max_body_size 50M;
    }
}
```

### 6.4 启用配置并重启 Nginx

```bash
sudo ln -s /etc/nginx/sites-available/ai-chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. 配置防火墙

### 7.1 设置 UFW 防火墙

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 8. 维护和更新

### 8.1 更新应用

```bash
cd /var/www/ai-chatbot
git pull
pnpm install
pnpm run build
pm2 restart ai-chatbot
```

### 8.2 查看日志

```bash
# 查看应用日志
pm2 logs ai-chatbot

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 8.3 备份数据库

```bash
# 创建备份目录
sudo mkdir -p /var/backups/aichatbot
sudo chown $USER:$USER /var/backups/aichatbot

# 备份数据库
pg_dump -U aichatbot aichatbot > /var/backups/aichatbot/backup_$(date +%Y%m%d).sql
```

### 8.4 创建自动备份脚本

```bash
nano /var/www/ai-chatbot/backup.sh
```

填入以下内容：
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/aichatbot"
FILENAME="backup_$(date +%Y%m%d_%H%M%S).sql"

# 创建备份
PGPASSWORD="你的数据库密码" pg_dump -U aichatbot aichatbot > "$BACKUP_DIR/$FILENAME"

# 保留最近 7 天的备份
find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +7 -delete
```

设置执行权限并添加到 crontab：
```bash
chmod +x /var/www/ai-chatbot/backup.sh
crontab -e
```

添加以下行（每天凌晨 2 点执行备份）：
```
0 2 * * * /var/www/ai-chatbot/backup.sh
```

## 9. 故障排除

### 9.1 应用无法启动

- 检查环境变量是否正确配置
  ```bash
  cat /var/www/ai-chatbot/.env.local
  ```

- 检查数据库连接是否正常
  ```bash
  psql -U aichatbot -d aichatbot -h localhost
  ```

- 查看 PM2 日志
  ```bash
  pm2 logs ai-chatbot
  ```

### 9.2 数据库连接问题

- 验证 PostgreSQL 服务是否运行
  ```bash
  sudo systemctl status postgresql
  ```

- 检查数据库用户权限
  ```bash
  sudo -i -u postgres
  psql -c "\du"
  ```

- 验证连接字符串是否正确
  ```bash
  # 测试连接
  PGPASSWORD="你的密码" psql -U aichatbot -d aichatbot -h localhost -c "SELECT 1;"
  ```

### 9.3 Nginx 配置问题

- 检查 Nginx 配置语法
  ```bash
  sudo nginx -t
  ```

- 查看 Nginx 错误日志
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```

- 确认 SSL 证书路径是否正确
  ```bash
  sudo ls -la /etc/letsencrypt/live/你的域名.com/
  ```

## 10. 安全建议

1. **定期更新系统和依赖包**
   ```bash
   sudo apt update && sudo apt upgrade -y
   cd /var/www/ai-chatbot
   pnpm update
   ```

2. **使用强密码并定期更改**
   - 数据库密码
   - 服务器用户密码
   - AUTH_SECRET 环境变量

3. **配置自动备份**
   - 按照 8.4 节设置自动备份
   - 考虑将备份复制到外部存储

4. **启用 HTTPS 并配置适当的安全头**
   - 确保使用 SSL 证书
   - 配置 HTTP 安全头

5. **限制 SSH 访问**
   - 使用密钥认证而非密码
   ```bash
   # 在本地生成 SSH 密钥
   ssh-keygen -t ed25519 -C "your_email@example.com"
   
   # 将公钥复制到服务器
   ssh-copy-id user@your-server-ip
   
   # 禁用密码认证
   sudo nano /etc/ssh/sshd_config
   # 设置 PasswordAuthentication no
   # 设置 ChallengeResponseAuthentication no
   
   # 重启 SSH 服务
   sudo systemctl restart sshd
   ```

6. **定期检查日志文件**
   - 设置日志监控和警报
   - 使用工具如 Fail2ban 防止暴力攻击

---

部署完成后，你可以通过域名访问你的 AI 聊天机器人。如有任何问题，请参考上述故障排除部分或查看相关日志文件。
