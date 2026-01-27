/**
 * Agent 模块 - 主入口
 */

// 导出 Agent 类和工厂函数
export { PlantKBAgent, createAgent } from "./agent";

// 导出配置
export { AGENT_CONFIG, SYSTEM_PROMPT, TOOL_LABELS } from "./config";

// 导出工具
export { createAgentTools, baseTools } from "./tools";
export {
    searchPlant,
    getPlantDetail,
    createPlantTool,
    listFamilies,
} from "./tools";

// 导出日志记录器
export { AgentLogger, createAgentLogger } from "./logger";
