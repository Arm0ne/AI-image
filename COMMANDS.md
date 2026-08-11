# 无限画布 - 快速命令参考

## 🚀 首次部署

```bash
# 1. 上传项目到服务器
scp -r D:\无限画布 user@your-server:/path/to/

# 或使用 Git
git clone https://github.com/basketikun/infinite-canvas.git
cd infinite-canvas
git checkout custom

# 2. 执行部署脚本
chmod +x deploy.sh
./deploy.sh

# 3. 访问
http://your-server-ip:3000
```

## 🔄 更新流程

```bash
# 方式一：使用更新脚本（推荐）
./update.sh

# 方式二：手动更新
git checkout main
git pull origin main
git checkout custom
git merge main

# 重新部署
./deploy.sh
```

## 🐳 Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看日志
docker logs infinite-canvas
docker logs -f infinite-canvas  # 实时查看

# 进入容器
docker exec -it infinite-canvas sh

# 重启容器
docker restart infinite-canvas

# 停止容器
docker stop infinite-canvas

# 删除容器
docker rm infinite-canvas

# 查看镜像
docker images

# 删除镜像
docker rmi infinite-canvas:custom

# 清理未使用的资源
docker system prune -a
```

## 📦 构建相关

```bash
# 仅构建镜像（不启动）
docker build -t infinite-canvas:custom .

# 强制重新构建（不使用缓存）
docker build --no-cache -t infinite-canvas:custom .

# 手动启动容器
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:custom
```

## 🌐 Nginx 相关（如果使用域名）

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl reload nginx
sudo systemctl restart nginx

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔐 HTTPS 证书

```bash
# 申请证书
sudo certbot --nginx -d your-domain.com

# 续期证书
sudo certbot renew

# 自动续期（添加到 crontab）
0 0 * * * certbot renew --quiet
```

## 🔥 防火墙

```bash
# 开放端口
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443

# 查看防火墙状态
sudo ufw status
```

## 🐛 故障排查

```bash
# 检查端口占用
netstat -tuln | grep 3000
lsof -i :3000

# 检查容器资源使用
docker stats infinite-canvas

# 查看容器详细信息
docker inspect infinite-canvas

# 测试网络连接
curl http://localhost:3000
curl -I http://localhost:3000
```

## 📊 监控

```bash
# 实时查看日志
docker logs -f --tail 100 infinite-canvas

# 查看容器进程
docker top infinite-canvas

# 查看容器资源使用
docker stats
```

## 💾 备份与恢复

```bash
# 导出镜像
docker save infinite-canvas:custom -o infinite-canvas-backup.tar

# 导入镜像
docker load -i infinite-canvas-backup.tar

# 备份容器数据（如果有持久化数据）
docker cp infinite-canvas:/path/in/container /backup/path
```

## 🔧 开发调试

```bash
# 本地开发服务器
cd web
bun install
bun run dev

# 构建前端
bun run build

# 预览构建产物
bun run preview
```

## 📝 Git 操作

```bash
# 查看当前分支
git branch

# 查看远程分支
git branch -r

# 查看所有分支
git branch -a

# 切换分支
git checkout main
git checkout custom

# 创建并切换分支
git checkout -b new-branch

# 查看提交历史
git log --oneline -10

# 查看文件修改
git status
git diff
```

## 🎨 自定义修改的文件

如果需要手动修改或恢复：

```bash
web/src/components/particle-canvas.tsx       # 粒子动画
web/src/pages/home/index.tsx                 # 首页发光效果
web/src/components/layout/user-status-actions.tsx  # 顶部菜单
web/src/styles/globals.css                   # 全局样式
```

---

## 常见问题

**Q: 容器无法启动？**
```bash
docker logs infinite-canvas
# 检查端口是否被占用
netstat -tuln | grep 3000
```

**Q: 访问不了？**
```bash
# 检查容器状态
docker ps
# 检查防火墙
sudo ufw status
sudo ufw allow 3000
```

**Q: 更新后样式丢失？**
```bash
# 清除浏览器缓存
# 或强制重建
docker build --no-cache -t infinite-canvas:custom .
./deploy.sh
```

**Q: 如何回退到上一个版本？**
```bash
git log --oneline  # 找到要回退的 commit
git reset --hard <commit-hash>
./deploy.sh
```
