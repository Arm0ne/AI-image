# 部署文档 - v0.18.0-custom

## 📅 版本信息

- **版本号**: v0.18.0-custom
- **发布日期**: 2026-09-11
- **Git 标签**: v0.18.0-custom
- **Git 提交**: c388957
- **部署分支**: custom

## 🎯 本次更新内容

### 新增功能（来自上游 v0.18.0）

#### 1. 本地代理配置
- 新增「本地代理」配置标签页
- 支持通过本地代理转发所有 API 请求（模型列表、生图、生视频、文本、音频）
- 配套独立代理工具：`npx @basketikun/canvas-proxy@latest`
- 默认代理地址：`http://127.0.0.1:23210`

#### 2. 图片分辨率改进
- 图片 1K/2K/4K 按宽高比使用固定尺寸表
- 图像设置将分辨率与宽高比拆开独立配置
- 自动计算最优尺寸

#### 3. 画布功能增强
- 多选节点后显示整体虚线选区
- 支持一键打组/解散组
- 组节点可包裹选中内容
- 节点引用栏预览和管理

#### 4. 视频生成改进
- 视频设置支持首尾帧和全能参考模式
- 调用脚本可通过 `params.mode` 区分参考图字段
- 视频分辨率使用 480p/720p/1080p 标准
- 支持 1:1、3:4、4:3、16:9、9:16、21:9 宽高比
- 时长范围改为 4-30 秒滑杆

#### 5. 提示词功能
- 新增提示词来源管理
- 支持搜索和快速选择
- 集成多个提示词库

#### 6. WebDAV 同步改进
- 记录已删除画布，避免恢复旧版本
- 本地代理开启后，WebDAV 测试和同步也走代理
- 关闭代理时保持直连

#### 7. 其他改进
- 我的资产下载改为读取本地文件内容
- 多参考图编辑使用 OpenAI 规范的 `image[]` 格式
- URL 导入 API 凭据时按 Base URL 更新
- 生成提示词附带上游文本改为分块编号

### 保留功能（自定义功能）

#### 1. Sub2API 集成
- ✅ 用户登录和账号同步
- ✅ 自动拉取 API 密钥配置
- ✅ 余额显示

#### 2. Panlai API 直连
- ✅ 生产环境浏览器直连 Panlai API
- ✅ 开发环境 Vite 代理转发
- ✅ CORS 问题自动处理

#### 3. 版本管理
- ✅ 自动版本检测
- ✅ 强制刷新提示
- ✅ 构建时生成唯一标识

#### 4. 用户体验
- ✅ 退出登录清理凭据
- ✅ 图片下载格式配置（original/webp）
- ✅ 首页粒子动画和发光效果
- ✅ 橙色主题 (#ff7700)

## 🚀 部署步骤

### 前置条件

- Docker 已安装并运行
- 服务器端口 3000 开放
- 域名已解析到服务器（如使用域名）
- Git 仓库访问权限

### 方式 1：直接使用 Git 标签部署（推荐）

```bash
# 1. 克隆仓库或拉取最新代码
cd /path/to/your/server
git clone https://github.com/Arm0ne/AI-image.git
cd AI-image

# 2. 切换到部署标签
git checkout v0.18.0-custom

# 3. 构建 Docker 镜像
docker build -t infinite-canvas:v0.18.0 .

# 4. 停止旧容器（如果存在）
docker stop infinite-canvas 2>/dev/null || true
docker rm infinite-canvas 2>/dev/null || true

# 5. 启动新容器
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:v0.18.0

# 6. 验证启动
docker ps | grep infinite-canvas
docker logs infinite-canvas
```

### 方式 2：使用现有部署更新

```bash
# 1. 进入项目目录
cd /path/to/AI-image

# 2. 停止当前容器
docker stop infinite-canvas
docker rm infinite-canvas

# 3. 拉取最新代码
git fetch --all --tags
git checkout v0.18.0-custom

# 4. 重新构建和启动
docker build -t infinite-canvas:v0.18.0 .
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:v0.18.0
```

### 方式 3：零停机更新（推荐生产环境）

```bash
# 1. 构建新镜像
docker build -t infinite-canvas:v0.18.0 .

# 2. 启动新容器（使用不同端口）
docker run -d \
  --name infinite-canvas-new \
  -p 3001:3000 \
  --restart unless-stopped \
  infinite-canvas:v0.18.0

# 3. 验证新容器正常运行
curl http://localhost:3001
docker logs infinite-canvas-new

# 4. 更新 Nginx 代理配置（如果使用）
# 将 proxy_pass 从 :3000 改为 :3001

# 5. 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 6. 停止并删除旧容器
docker stop infinite-canvas
docker rm infinite-canvas

# 7. 重命名新容器
docker rename infinite-canvas-new infinite-canvas

# 8. 如果使用 Nginx，改回原端口并重载
```

## 🔧 配置说明

### 环境变量（可选）

在 `docker run` 命令中添加环境变量：

```bash
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  -e ANALYTICS_GA4_ID="G-XXXXXXXXXX" \
  -e ANALYTICS_BAIDU_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --restart unless-stopped \
  infinite-canvas:v0.18.0
```

### Nginx 反向代理配置（如使用域名）

创建 `/etc/nginx/sites-available/infinite-canvas`：

```nginx
server {
    listen 80;
    server_name img.panlai.me;  # 你的域名

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
        
        # 增加超时时间（用于长时间生成任务）
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/infinite-canvas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

配置 HTTPS（强烈推荐）：

```bash
sudo certbot --nginx -d img.panlai.me
```

## ✅ 部署后验证

### 1. 基础验证

```bash
# 检查容器状态
docker ps | grep infinite-canvas

# 查看容器日志
docker logs infinite-canvas --tail 50

# 测试端口访问
curl -I http://localhost:3000
```

### 2. 功能验证清单

访问 `http://your-domain:3000` 或 `https://img.panlai.me`，验证：

- [ ] 首页正常加载，粒子动画显示
- [ ] 登录功能正常（Sub2API）
- [ ] 余额显示正常
- [ ] 图片生成工作台可用
- [ ] Image 模型生成正常
- [ ] Gemini 模型生成正常（无 CORS 错误）
- [ ] 视频生成功能正常
- [ ] 画布功能正常
- [ ] 多选节点分组功能可用
- [ ] 配置页面「本地代理」标签存在
- [ ] 图片分辨率选项更新（1K/2K/4K）
- [ ] 退出登录清理正常
- [ ] 版本信息正确显示

### 3. 性能验证

```bash
# 检查内存使用
docker stats infinite-canvas --no-stream

# 检查磁盘使用
docker system df
```

## 🔄 回滚方案

如果新版本出现问题，可以快速回滚：

```bash
# 1. 查看可用标签
git tag -l

# 2. 回滚到上一个版本（假设是 v0.17.0）
git checkout v0.17.0

# 3. 重新构建和部署
docker build -t infinite-canvas:v0.17.0 .
docker stop infinite-canvas
docker rm infinite-canvas
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:v0.17.0
```

## 📊 监控建议

### 日志监控

```bash
# 实时查看日志
docker logs -f infinite-canvas

# 查看最近 100 行
docker logs infinite-canvas --tail 100

# 查看特定时间段
docker logs infinite-canvas --since 2026-09-11T00:00:00
```

### 资源监控

```bash
# 持续监控资源使用
docker stats infinite-canvas

# 检查磁盘空间
df -h
docker system df
```

### 告警设置

建议设置以下告警：

1. 容器停止运行
2. 内存使用超过 80%
3. 磁盘使用超过 85%
4. HTTP 5xx 错误率超过 1%

## 🐛 常见问题

### 问题 1：端口被占用

```bash
# 查看端口占用
netstat -tuln | grep 3000

# 更换端口
docker run -d \
  --name infinite-canvas \
  -p 3001:3000 \
  --restart unless-stopped \
  infinite-canvas:v0.18.0
```

### 问题 2：容器启动失败

```bash
# 查看详细错误
docker logs infinite-canvas

# 检查镜像是否正确构建
docker images | grep infinite-canvas

# 重新构建（不使用缓存）
docker build --no-cache -t infinite-canvas:v0.18.0 .
```

### 问题 3：Gemini 模型 CORS 错误

这不应该发生在生产环境（img.panlai.me），如果出现：

1. 检查域名配置是否正确
2. 确认 Nginx 代理设置正确
3. 查看浏览器控制台具体错误信息

### 问题 4：图片上传失败

```bash
# 检查容器内存储空间
docker exec infinite-canvas df -h

# 增加容器内存限制
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --memory="2g" \
  --restart unless-stopped \
  infinite-canvas:v0.18.0
```

## 📝 维护建议

### 定期维护

1. **每周**：检查日志，清理无用镜像
   ```bash
   docker system prune -f
   ```

2. **每月**：更新系统和 Docker
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo systemctl restart docker
   ```

3. **每季度**：备份用户数据和配置

### 备份策略

```bash
# 备份容器数据卷（如果使用）
docker run --rm \
  --volumes-from infinite-canvas \
  -v $(pwd):/backup \
  alpine tar czf /backup/canvas-backup-$(date +%Y%m%d).tar.gz /data

# 备份 Nginx 配置
sudo tar czf nginx-config-backup-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/
```

## 📞 技术支持

- **GitHub Issues**: https://github.com/Arm0ne/AI-image/issues
- **上游项目**: https://github.com/原作者/infinite-canvas
- **部署文档**: 项目根目录 `DEPLOY.md`

## 📄 更新日志

完整更新日志请查看：`CHANGELOG.md`

---

**部署完成后请保存此文档作为运维参考！**

部署时间：2026-09-11  
部署人员：_____________  
服务器地址：_____________  
备注：_____________
