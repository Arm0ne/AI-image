#!/bin/bash

# 无限画布 - 更新脚本
# 用于合并原作者的最新更新到你的 custom 分支
# 使用方法：chmod +x update.sh && ./update.sh

set -e

echo "=========================================="
echo "  无限画布 - 更新脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Git 状态
echo -e "${YELLOW}[1/5]${NC} 检查工作区状态..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}错误: 工作区有未提交的修改${NC}"
    echo "请先提交或暂存修改："
    echo "  git add ."
    echo "  git commit -m '提交信息'"
    exit 1
fi
echo -e "${GREEN}✓ 工作区干净${NC}"
echo ""

# 切换到 main 分支
echo -e "${YELLOW}[2/5]${NC} 切换到 main 分支..."
git checkout main
echo -e "${GREEN}✓ 已切换到 main 分支${NC}"
echo ""

# 拉取最新代码
echo -e "${YELLOW}[3/5]${NC} 拉取原作者最新代码..."
git pull origin main
echo -e "${GREEN}✓ 已拉取最新代码${NC}"
echo ""

# 切换回 custom 分支
echo -e "${YELLOW}[4/5]${NC} 切换回 custom 分支..."
git checkout custom
echo -e "${GREEN}✓ 已切换到 custom 分支${NC}"
echo ""

# 合并 main 分支
echo -e "${YELLOW}[5/5]${NC} 合并 main 分支的更新..."
if git merge main --no-edit; then
    echo -e "${GREEN}✓ 合并成功，无冲突${NC}"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}更新完成！${NC}"
    echo "=========================================="
    echo ""
    echo "现在可以重新部署："
    echo "  ./deploy.sh"
    echo ""
else
    echo -e "${RED}✗ 合并出现冲突${NC}"
    echo ""
    echo "请手动解决冲突："
    echo "  1. 编辑冲突文件，解决 <<<<<<< 标记的冲突"
    echo "  2. git add <解决的文件>"
    echo "  3. git commit"
    echo "  4. ./deploy.sh"
    echo ""
    exit 1
fi
