/**
 * PlantKB Agent
 * 统一的 Agent 接口
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { db } from "@/db";
import { llmConfigs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createAgentTools } from "./tools";

// LLM 配置类型
interface LLMConfig {
    id: number;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    endpoint: string | null;
    isDefault: boolean;
}

/**
 * 获取激活的 LLM 配置
 */
async function getActiveLlmConfig(): Promise<LLMConfig | undefined> {
    const [defaultConfig] = await db
        .select()
        .from(llmConfigs)
        .where(eq(llmConfigs.isDefault, true))
        .limit(1);

    if (defaultConfig) {
        return defaultConfig;
    }

    const [latest] = await db.select().from(llmConfigs).orderBy(desc(llmConfigs.id)).limit(1);
    return latest;
}

/**
 * 创建 LLM Provider
 */
function createLLMProvider(config: LLMConfig) {
    const baseURLWithPrefix = `${config.baseUrl}/api/v3`;

    return createOpenAICompatible({
        name: "volcengine",
        apiKey: config.apiKey,
        baseURL: baseURLWithPrefix,
    });
}

/**
 * PlantKB Agent 类
 */
export class PlantKBAgent {
    private config: LLMConfig | null = null;
    private provider: ReturnType<typeof createOpenAICompatible> | null = null;

    /**
     * 初始化 Agent
     */
    async initialize(): Promise<void> {
        this.config = await getActiveLlmConfig() || null;
        if (!this.config) {
            throw new Error("No LLM config found. Please configure an LLM in the admin panel.");
        }
        this.provider = createLLMProvider(this.config);
    }

    /**
     * 检查是否已初始化
     */
    private ensureInitialized() {
        if (!this.config || !this.provider) {
            throw new Error("Agent not initialized. Call initialize() first.");
        }
    }

    /**
     * 获取模型实例
     */
    getModel() {
        this.ensureInitialized();
        return this.provider!(this.config!.model);
    }

    /**
     * 获取工具集
     */
    getTools() {
        const model = this.getModel();
        return createAgentTools(model);
    }
}

/**
 * 创建 Agent 实例（工厂函数）
 */
export async function createAgent(): Promise<PlantKBAgent> {
    const agent = new PlantKBAgent();
    await agent.initialize();
    return agent;
}
