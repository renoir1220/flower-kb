/**
 * Agent 执行日志记录器
 * 
 * 记录 Agent 执行过程中的每一步，用于性能分析
 */
import { db } from "@/db";
import { agentSessions, agentSteps } from "@/db/schema";
import { eq } from "drizzle-orm";

// 生成唯一 ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// 步骤类型
export type StepType = "llm_response" | "tool_call" | "tool_result";

// 步骤日志选项
export interface StepLogOptions {
    stepType: StepType;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    reasoning?: string;
    promptTokens?: number;
    completionTokens?: number;
    error?: string;
}

/**
 * Agent 日志记录器
 */
export class AgentLogger {
    private sessionId: string;
    private conversationId?: string;
    private stepNumber: number = 0;
    private startTime: number;
    private stepStartTime?: number;

    constructor(conversationId?: string) {
        this.sessionId = generateId();
        this.conversationId = conversationId;
        this.startTime = Date.now();
    }

    /**
     * 获取会话 ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * 开始会话，写入数据库
     */
    async startSession(): Promise<void> {
        try {
            await db.insert(agentSessions).values({
                id: this.sessionId,
                conversationId: this.conversationId || null,
                startedAt: new Date(),
                status: "running",
            });
        } catch (error) {
            console.error("[AgentLogger] Failed to start session:", error);
        }
    }

    /**
     * 开始记录一个步骤（用于计算耗时）
     */
    startStep(): void {
        this.stepStartTime = Date.now();
    }

    /**
     * 记录一个步骤
     */
    async logStep(options: StepLogOptions): Promise<void> {
        this.stepNumber++;
        const now = Date.now();
        const durationMs = this.stepStartTime ? now - this.stepStartTime : undefined;

        try {
            await db.insert(agentSteps).values({
                sessionId: this.sessionId,
                stepNumber: this.stepNumber,
                stepType: options.stepType,
                toolName: options.toolName || null,
                startedAt: this.stepStartTime ? new Date(this.stepStartTime) : new Date(),
                finishedAt: new Date(now),
                durationMs: durationMs || null,
                input: options.input ? JSON.stringify(options.input) : null,
                output: options.output ? JSON.stringify(options.output) : null,
                reasoning: options.reasoning || null,
                promptTokens: options.promptTokens || null,
                completionTokens: options.completionTokens || null,
                error: options.error || null,
            });

            // 更新会话的步骤数和 token 统计
            await db
                .update(agentSessions)
                .set({
                    totalSteps: this.stepNumber,
                    totalPromptTokens: options.promptTokens || 0,
                    totalCompletionTokens: options.completionTokens || 0,
                })
                .where(eq(agentSessions.id, this.sessionId));

        } catch (error) {
            console.error("[AgentLogger] Failed to log step:", error);
        }

        // 重置步骤开始时间
        this.stepStartTime = undefined;
    }

    /**
     * 结束会话
     */
    async finishSession(status: "completed" | "error", errorMessage?: string): Promise<void> {
        const now = Date.now();
        const totalDurationMs = now - this.startTime;

        try {
            await db
                .update(agentSessions)
                .set({
                    finishedAt: new Date(now),
                    totalDurationMs,
                    totalSteps: this.stepNumber,
                    status,
                    errorMessage: errorMessage || null,
                })
                .where(eq(agentSessions.id, this.sessionId));
        } catch (error) {
            console.error("[AgentLogger] Failed to finish session:", error);
        }
    }
}

/**
 * 创建日志记录器
 */
export function createAgentLogger(conversationId?: string): AgentLogger {
    return new AgentLogger(conversationId);
}
