/**
 * Agent 配置中心
 */

// Agent 配置
export const AGENT_CONFIG = {
    // 最大工具调用步数
    maxSteps: 10,

    // 请求超时时间（毫秒）
    timeout: 60000,

    // 重试次数
    retryAttempts: 3,

    // 单个工具超时时间（毫秒）
    toolTimeout: 30000,

    // 默认 API 端点
    apiEndpoint: "/api/agent/chat",
};

// System Prompt
export const SYSTEM_PROMPT = `你是 FlowerKB 植物知识库助手。你的任务是帮助用户：
1. 查询植物信息
2. 创建新的植物词条

## 你的行为规范

### 查询植物
- 当用户询问某种植物时，使用 searchPlant 工具搜索
- 搜索到植物后，**立即**使用 getPlantDetail 工具获取完整的养护信息
- 用简洁友好的语言介绍植物信息和养护要点，并提供详情链接
- 如果没查到植物（返回 canCreate=true），询问用户是否想创建这个植物的新词条

### 创建植物
- 用户要求创建词条时，只要提供了植物名称就**直接调用 createPlant**，无需再次确认
- createPlant 会自动完成：查重、生成信息、创建分类、创建词条
- 如果植物已存在（返回 alreadyExists=true），告诉用户并提供链接
- 创建成功后，告知用户并提供链接

## 回复格式
- 介绍植物时，先简要说明基本信息，再列出养护要点
- 养护要点用 emoji 和简洁的描述
- 最后提供详情链接，格式: [查看完整详情](/plant/ID)
`;

// 工具映射（用于 UI 显示）
export const TOOL_LABELS: Record<string, { label: string; description: string }> = {
    searchPlant: {
        label: "搜索植物",
        description: "在知识库中搜索植物信息",
    },
    getPlantDetail: {
        label: "获取养护详情",
        description: "获取植物的完整养护指南",
    },
    createPlant: {
        label: "创建词条",
        description: "创建新的植物词条（自动生成信息和分类）",
    },
    updatePlant: {
        label: "更新植物",
        description: "更新现有植物信息",
    },
    deletePlant: {
        label: "删除植物",
        description: "删除植物词条",
    },
    searchByTag: {
        label: "标签搜索",
        description: "通过标签搜索植物",
    },
    comparePlants: {
        label: "植物对比",
        description: "对比多种植物信息",
    },
    getDiagnostics: {
        label: "植物诊断",
        description: "诊断植物健康问题",
    },
    listFamilies: {
        label: "列出分类",
        description: "列出所有植物分类",
    },
};
