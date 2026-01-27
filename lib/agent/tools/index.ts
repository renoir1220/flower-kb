/**
 * 工具集合 - 导出所有 Agent 工具
 */
import { generateText } from "ai";
import { searchPlant } from "./searchPlant";
import { getPlantDetail } from "./getPlantDetail";
import { createPlantTool } from "./createPlant";
import { listFamilies } from "./listFamilies";
import { updatePlant } from "./updatePlant";
import { deletePlant } from "./deletePlant";
import { searchByTag } from "./searchByTag";
import { comparePlants } from "./comparePlants";
import { getDiagnosticsTool } from "./getDiagnostics";

// 从 generateText 推断 model 类型
type GenerateTextParams = Parameters<typeof generateText>[0];
type ModelType = GenerateTextParams["model"];

// 导出单个工具
export { searchPlant } from "./searchPlant";
export { getPlantDetail } from "./getPlantDetail";
export { createPlantTool } from "./createPlant";
export { listFamilies } from "./listFamilies";
export { updatePlant } from "./updatePlant";
export { deletePlant } from "./deletePlant";
export { searchByTag } from "./searchByTag";
export { comparePlants } from "./comparePlants";
export { getDiagnosticsTool } from "./getDiagnostics";

/**
 * 创建完整的工具集
 * @param model - LLM 模型实例（用于需要调用 LLM 的工具）
 */
export function createAgentTools(model: ModelType) {
    return {
        searchPlant,
        getPlantDetail,
        createPlant: createPlantTool({ model }),
        listFamilies,
        updatePlant,
        deletePlant,
        searchByTag,
        comparePlants,
        getDiagnostics: getDiagnosticsTool({ model }),
    };
}

/**
 * 基础工具集（不需要 LLM 的工具）
 */
export const baseTools = {
    searchPlant,
    getPlantDetail,
    listFamilies,
    updatePlant,
    deletePlant,
    searchByTag,
    comparePlants,
};
