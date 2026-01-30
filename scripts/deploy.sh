#!/bin/bash
#
# FlowerKB 一键部署脚本
# 用于将本地代码同步到腾讯云服务器并重新构建 Docker 容器
#

set -e

# ============ 配置区 ============
SERVER_IP="43.163.87.184"
SERVER_USER="root"
SERVER_PORT="22"
REMOTE_PATH="/www/wwwroot/flower-kb"
SSH_KEY="$(dirname "$0")/deploy-key"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FlowerKB 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查密钥文件
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}错误: 找不到 SSH 密钥文件: $SSH_KEY${NC}"
    exit 1
fi

# 设置密钥权限
chmod 600 "$SSH_KEY"

# SSH 命令封装
SSH_CMD="ssh -i $SSH_KEY -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP"

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${YELLOW}[1/4] 同步代码到服务器...${NC}"
rsync -avz --progress --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'data' \
    --exclude '.env' \
    --exclude 'scripts/deploy-key' \
    -e "ssh -i $SSH_KEY -p $SERVER_PORT -o StrictHostKeyChecking=no" \
    "$PROJECT_DIR/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo ""
echo -e "${YELLOW}[2/4] 停止旧容器...${NC}"
$SSH_CMD "cd $REMOTE_PATH && docker compose down || true"

echo ""
echo -e "${YELLOW}[3/4] 重新构建并启动容器...${NC}"
$SSH_CMD "cd $REMOTE_PATH && docker compose up -d --build"

echo ""
echo -e "${YELLOW}[4/4] 查看容器状态...${NC}"
$SSH_CMD "cd $REMOTE_PATH && docker compose ps"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}  访问: http://$SERVER_IP:3088${NC}"
echo -e "${GREEN}========================================${NC}"
