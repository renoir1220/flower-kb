# FlowerKB 部署配置文档

> 最后更新: 2026-02-10

## 服务器信息

| 项目       | 值                   |
| ---------- | -------------------- |
| 服务器 IP  | `43.163.87.184`      |
| 操作系统   | Ubuntu 24.04.3 LTS   |
| SSH 用户   | `ubuntu`             |
| SSH 端口   | `22`                 |
| 部署路径   | `/www/wwwroot/flower-kb` |
| 访问地址   | http://43.163.87.184:3088 |

## 架构概览

```
┌─────────────────────────────────────────────┐
│              远程服务器 (Ubuntu)              │
│                                             │
│  ┌─────────────────────┐  ┌──────────────┐  │
│  │   Docker 容器        │  │ PostgreSQL   │  │
│  │   (Next.js App)      │──│ (宿主机直装)  │  │
│  │   端口: 3088→3000    │  │ 端口: 5432   │  │
│  └─────────────────────┘  └──────────────┘  │
│        host.docker.internal                  │
└─────────────────────────────────────────────┘
```

- **PostgreSQL** 直接安装在宿主机上（非容器化），便于外网访问和数据持久化
- **Next.js 应用** 运行在 Docker 容器内，通过 `host.docker.internal` 连接宿主机 PG

## PostgreSQL 配置

| 项目       | 值             |
| ---------- | -------------- |
| 版本       | 16             |
| 数据库名   | `flower_kb`    |
| 用户名     | `flower_kb`    |
| 密码       | `6pFJA4tBHrCztGYJ` |
| 监听地址   | `*`（支持外网访问）|
| 认证方式   | `scram-sha-256` |

### 配置文件路径

- `postgresql.conf`: `/etc/postgresql/16/main/postgresql.conf`
  - 已修改 `listen_addresses = '*'`
- `pg_hba.conf`: `/etc/postgresql/16/main/pg_hba.conf`
  - 已追加 `host all all 0.0.0.0/0 scram-sha-256`

### 连接字符串

```bash
# 本地开发（直连远程服务器）
DATABASE_URL="postgresql://flower_kb:6pFJA4tBHrCztGYJ@43.163.87.184:5432/flower_kb"

# 生产环境（容器内通过 host.docker.internal 访问宿主机）
DATABASE_URL="postgresql://flower_kb:6pFJA4tBHrCztGYJ@host.docker.internal:5432/flower_kb"
```

## Docker 配置

| 项目             | 值                  |
| ---------------- | ------------------- |
| Docker 来源      | `docker.io`（apt 安装）|
| Compose 插件版本 | v5.0.2              |
| Compose 插件路径 | `/usr/local/lib/docker/cli-plugins/docker-compose` |
| 镜像名           | `flower-kb-flower-kb` |
| 容器名           | `flower-kb-flower-kb-1` |

> **注意**: 使用 `docker.io` 包需要 `sudo` 前缀执行 docker 命令。

### docker-compose.yml 关键配置

```yaml
services:
  flower-kb:
    build: .
    ports:
      - "3088:3000"        # 外部 3088 → 容器内 3000
    extra_hosts:
      - "host.docker.internal:host-gateway"  # 容器访问宿主机服务
    restart: unless-stopped
    env_file:
      - .env               # 由 deploy.sh 自动生成
```

### 常用运维命令

```bash
# 在服务器上执行（需 sudo）
sudo docker compose ps              # 查看容器状态
sudo docker compose logs -f         # 查看实时日志
sudo docker compose restart         # 重启容器
sudo docker compose down             # 停止并移除容器
sudo docker compose up -d --build   # 重新构建并启动
```

## 部署流程

执行本地脚本一键部署：

```bash
bash scripts/deploy.sh
```

脚本自动完成以下步骤：

1. **同步代码** — rsync 排除 `node_modules/.next/.git/data/.env` 等
2. **生成 .env** — 在服务器写入生产环境 `DATABASE_URL`
3. **停止旧容器** — `sudo docker compose down`
4. **构建并启动** — `sudo docker compose up -d --build`
5. **健康检查** — curl 检测 HTTP 状态码

> 部署脚本使用密码认证，每个 SSH 连接都会提示输入密码。

## 数据库备份与还原

### 备份

```bash
# 在服务器上执行
PGPASSWORD='6pFJA4tBHrCztGYJ' pg_dump -h 127.0.0.1 -U flower_kb flower_kb > flower_kb_backup.sql
```

### 还原

SQL 备份文件由 PG 18 生成，还原到 PG 16 时需移除不兼容语法：

```bash
# 清理不兼容语法
grep -v '\\restrict' backup.sql | grep -v 'SET transaction_timeout' > clean.sql

# 还原
PGPASSWORD='6pFJA4tBHrCztGYJ' psql -h 127.0.0.1 -U flower_kb -d flower_kb -f clean.sql
```

## .env 管理策略

| 环境     | 文件位置                | DATABASE_URL 指向          |
| -------- | ----------------------- | -------------------------- |
| 本地开发 | 项目根目录 `.env`       | `43.163.87.184:5432`（远程直连）|
| 生产部署 | 服务器 `.env`（自动生成）| `host.docker.internal:5432`  |

- `.env` 已被 `.gitignore` 和 `.dockerignore` 排除
- 生产 `.env` 由 `deploy.sh` 每次部署时自动生成，无需手动维护
