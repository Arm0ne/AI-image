#!/bin/bash

# 无限画布 - 一键部署脚本
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e

echo "=========================================="
echo "  无限画布 Docker 部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
echo -e "${YELLOW}[1/6]${NC} 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker 已安装${NC}"
echo ""

# 检查当前分支
echo -e "${YELLOW}[2/6]${NC} 检查当前分支..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "custom" ]; then
    echo -e "${YELLOW}当前分支: $CURRENT_BRANCH${NC}"
    echo "建议使用 custom 分支部署。是否切换到 custom 分支? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git checkout custom
        echo -e "${GREEN}✓ 已切换到 custom 分支${NC}"
    fi
else
    echo -e "${GREEN}✓ 当前分支: custom${NC}"
fi
echo ""

# 停止旧容器
echo -e "${YELLOW}[3/6]${NC} 停止旧容器（如果存在）..."
if docker ps -a | grep -q infinite-canvas; then
    docker stop infinite-canvas 2>/dev/null || true
    docker rm infinite-canvas 2>/dev/null || true
    echo -e "${GREEN}✓ 旧容器已清理${NC}"
else
    echo -e "${GREEN}✓ 无旧容器${NC}"
fi
echo ""

# 构建 Docker 镜像
echo -e "${YELLOW}[4/6]${NC} 构建 Docker 镜像..."
docker build -t infinite-canvas:custom .
echo -e "${GREEN}✓ 镜像构建完成${NC}"
echo ""

# 启动容器
echo -e "${YELLOW}[5/6]${NC} 启动容器..."
docker run -d \
  --name infinite-canvas \
  -p 3000:3000 \
  --restart unless-stopped \
  infinite-canvas:custom

echo -e "${GREEN}✓ 容器启动成功${NC}"
echo ""

# 检查容器状态
echo -e "${YELLOW}[6/6]${NC} 检查容器状态..."
sleep 2
if docker ps | grep -q infinite-canvas; then
    echo -e "${GREEN}✓ 容器运行正常${NC}"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}部署成功！${NC}"
    echo "=========================================="
    echo ""
    echo "访问地址："
    echo "  http://localhost:3000"
    echo "  http://$(hostname -I | awk '{print $1}'):3000"
    echo ""
    echo "常用命令："
    echo "  查看日志: docker logs infinite-canvas"
    echo "  重启容器: docker restart infinite-canvas"
    echo "  停止容器: docker stop infinite-canvas"
    echo ""
else
    echo -e "${RED}✗ 容器启动失败${NC}"
    echo "查看日志: docker logs infinite-canvas"
    exit 1
fi
