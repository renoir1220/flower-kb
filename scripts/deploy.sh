#!/bin/bash
#
# FlowerKB 一键部署脚本
# 用于将本地代码同步到腾讯云服务器并重新构建 Docker 容器
#

set -e

# ============ 配置区 ============
SERVER_IP="43.163.87.184"
SERVER_USER="ubuntu"
SERVER_PORT="22"
REMOTE_PATH="/www/wwwroot/flower-kb"

# 生产环境数据库连接（容器内通过 host.docker.internal 访问宿主机 PG）
PROD_DATABASE_URL="postgresql://flower_kb:6pFJA4tBHrCztGYJ@host.docker.internal:5432/flower_kb"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FlowerKB 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# SSH / SCP 命令封装
SSH_CMD="ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP"
SCP_PRE="scp -P $SERVER_PORT -o StrictHostKeyChecking=no"

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${YELLOW}[1/5] 同步代码到服务器...${NC}"
rsync -avz --progress --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'data' \
    --exclude '.env' \
    --exclude 'scripts/deploy-key' \
    -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no" \
    "$PROJECT_DIR/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo ""
echo -e "${YELLOW}[2/5] 生成生产环境 .env ...${NC}"
$SSH_CMD "echo 'DATABASE_URL=\"$PROD_DATABASE_URL\"' > $REMOTE_PATH/.env"
echo "已写入 DATABASE_URL (host.docker.internal)"

echo ""
echo -e "${YELLOW}[3/5] 停止旧容器...${NC}"
$SSH_CMD "cd $REMOTE_PATH && sudo docker compose down || true"

echo ""
echo -e "${YELLOW}[4/5] 重新构建并启动容器...${NC}"
$SSH_CMD "cd $REMOTE_PATH && sudo docker compose up -d --build"

echo ""
echo -e "${YELLOW}[5/5] 查看容器状态...${NC}"
$SSH_CMD "cd $REMOTE_PATH && sudo docker compose ps"


# 等待几秒后检查健康
sleep 3
HTTP_CODE=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://localhost:3088" 2>/dev/null || echo "000")

echo ""
echo -e "${GREEN}========================================${NC}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo -e "${GREEN}  部署完成！ (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}  部署完成，容器启动中... (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}  请稍候几秒后刷新页面${NC}"
fi
echo -e "${GREEN}  访问: http://$SERVER_IP:3088${NC}"
echo -e "${GREEN}========================================${NC}"
