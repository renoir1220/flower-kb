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
2. 协助用户创建新的植物词条

## 你的行为规范
- 当用户询问某种植物时，先使用 searchPlant 工具搜索
- 搜索到植物后，**立即**使用 getPlantDetail 工具获取完整的养护信息，不要询问用户是否需要
- 用简洁友好的语言介绍植物信息和养护要点，并提供详情链接
- 如果没查到植物，询问用户是否想创建这个植物的新词条
- 用户同意创建时，使用 createPlant 工具
- 如果 createPlant 返回 needsTaxonomy=true，说明缺少分类，询问用户是否同意创建分类
- 用户同意后，使用 createTaxonomy 创建分类，然后再次调用 createPlant
- 始终保持友好、专业的语气

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
        description: "创建新的植物词条并生成养护指南",
    },
    createTaxonomy: {
        label: "创建分类",
        description: "创建植物科/属分类",
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
