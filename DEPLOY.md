# 无限画布 - Docker 部署指南

## 📦 部署概述

本项目使用 Docker + Nginx 部署纯前端应用，AI 请求由浏览器直接调用您配置的 API。

## 🎯 分支说明

- **main**: 原作者主分支，用于跟随上游更新
- **custom**: 您的自定义分支，包含界面修改（粒子动画、发光效果等）

## 🚀 快速部署（推荐）

### 方式一：使用 Docker Compose（最简单）

#### 1. 准备服务器环境

```bash
# 安装 Docker 和 Docker Compose（如果未安装）
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 上传项目到服务器

```bash
# 在服务器上克隆仓库
git clone https://github.com/Arm0ne/infinite-canvas.git
cd infinite-canvas

# 切换到 custom 分支
git checkout custom
```

或者，如果无法 git clone，可以打包上传：
```bash
# 在本地执行（Windows）
tar -czf infinite-canvas-full.tar.gz --exclude=node_modules --exclude=.git --exclude=web/dist --exclude=web/node_modules .

# 上传到服务器后解压
tar -xzf infinite-canvas-full.tar.gz
cd infinite-canvas
```

#### 3. 构建并启动

```bash
# 构建 Docker 镜像
docker build -t infinite-canvas:custom .

# 启动容器
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:custom

# 或使用 docker-compose
docker-compose -f docker-compose.local.yml up -d
```

#### 4. 访问应用

打开浏览器访问：`http://your-server-ip:3000`

---

## 🔄 更新流程

### 跟随原作者更新

```bash
# 1. 切换到 main 分支，拉取最新代码
git checkout main
git pull origin main

# 2. 切换回 custom 分支
git checkout custom

# 3. 合并 main 的更新
git merge main

# 4. 如果有冲突，解决后提交
# git add .
# git commit -m "merge: 合并上游更新"

# 5. 重新构建并部署
docker build -t infinite-canvas:custom .
docker stop infinite-canvas
docker rm infinite-canvas
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:custom
```

---

## 📝 Nginx 配置（如果需要域名 + HTTPS）

### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. 创建 Nginx 配置

创建文件：`/etc/nginx/sites-available/infinite-canvas`

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名

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
        proxy_connect_timeout 15s;
        proxy_send_timeout 650s;
        proxy_read_timeout 650s;
        proxy_buffering off;
        client_max_body_size 100m;
    }
}
```

生图请求可能持续数分钟。宿主机反向代理的读写超时必须高于容器内 `/panlai-api/` 的 600 秒超时，否则超过默认 60 秒的请求会被宿主机提前中断。

### 3. 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/infinite-canvas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 HTTPS（可选但推荐）

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🛠️ 常用命令

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs infinite-canvas

# 重启容器
docker restart infinite-canvas

# 停止容器
docker stop infinite-canvas

# 删除容器
docker rm infinite-canvas

# 重新构建
docker build -t infinite-canvas:custom .
```

---

## 📊 配置统计分析（可选）

编辑 `docker-compose.yml`，取消注释并填入你的 ID：

```yaml
environment:
  ANALYTICS_GA4_ID: G-XXXXXXXXXX                    # Google Analytics 4
  ANALYTICS_BAIDU_ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxx   # 百度统计
```

---

## 🐛 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker logs infinite-canvas

# 检查端口占用
netstat -tuln | grep 3000
```

### 访问不了

1. 检查防火墙：`sudo ufw allow 3000`
2. 检查容器状态：`docker ps`
3. 检查 Nginx 配置：`sudo nginx -t`

### 构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker build --no-cache -t infinite-canvas:custom .
```

---

## 📂 文件说明

- `Dockerfile`: Docker 镜像构建配置
- `docker-compose.yml`: 使用官方镜像
- `docker-compose.local.yml`: 本地构建镜像
- `nginx.conf`: Nginx 配置文件
- `web/`: 前端源代码
- `web/dist/`: 构建产物（已在 .gitignore）

---

## ✅ 部署检查清单

- [ ] 服务器已安装 Docker
- [ ] 项目代码已上传到服务器
- [ ] 已切换到 custom 分支
- [ ] Docker 镜像构建成功
- [ ] 容器启动成功（docker ps 可见）
- [ ] 端口 3000 可访问
- [ ] 配置了域名和 HTTPS（可选）
- [ ] 配置了统计分析（可选）

---

## 🎨 自定义修改说明

当前 custom 分支包含以下定制：

1. **首页粒子动画**（`web/src/components/particle-canvas.tsx`）
   - 120 个橙色粒子 (#ff7700)
   - 鼠标交互效果（粒子躲避鼠标）
   
2. **发光效果**（`web/src/pages/home/index.tsx`）
   - 橙色径向渐变（中央）
   - 蓝色径向渐变（右下）

3. **移除文档按钮**（`web/src/components/layout/user-status-actions.tsx`）
   - 顶部导航右侧的 BookOpen 按钮已移除

4. **主题色调整**
   - 纯黑背景 (#050507)
   - 橙色主题 (#ff7700)

---

部署完成后，记得保存服务器地址和访问方式！
