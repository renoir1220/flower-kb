/**
 * Agent Chat API Route
 * 基于 AI SDK 官方文档的实现，带执行日志记录
 */
import { createAgent, SYSTEM_PROMPT } from "@/lib/agent";
import { createAgentLogger } from "@/lib/agent/logger";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    // 从请求中获取 conversationId（如果有）
    const { messages, conversationId }: { messages: UIMessage[]; conversationId?: string } = await req.json();

    // 创建日志记录器
    const logger = createAgentLogger(conversationId);

    try {
        // 开始记录会话
        await logger.startSession();

        // 初始化 Agent
        const agent = await createAgent();
        const model = agent.getModel();
        const tools = agent.getTools();

        // 记录输入消息
        const modelMessages = await convertToModelMessages(messages);

        // 转换消息格式并调用 LLM
        const result = streamText({
            model: model,
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools: tools,
            stopWhen: stepCountIs(10),

            // 每一步完成时记录
            onStepFinish: async (step) => {
                // 记录 LLM 响应
                if (step.text || step.reasoning) {
                    await logger.logStep({
                        stepType: "llm_response",
                        input: modelMessages.slice(-1), // 最后一条输入消息
                        output: step.text,
                        reasoning: typeof step.reasoning === 'string'
                            ? step.reasoning
                            : Array.isArray(step.reasoning)
                                ? step.reasoning.map((r: { text?: string }) => r.text || '').join('\n')
                                : undefined,
                        promptTokens: step.usage?.inputTokens,
                        completionTokens: step.usage?.outputTokens,
                    });
                }

                // 记录工具调用
                if (step.toolCalls && step.toolCalls.length > 0) {
                    for (const toolCall of step.toolCalls) {
                        await logger.logStep({
                            stepType: "tool_call",
                            toolName: toolCall.toolName,
                            input: 'args' in toolCall ? toolCall.args : undefined,
                        });
                    }
                }

                // 记录工具结果
                if (step.toolResults && step.toolResults.length > 0) {
                    for (const toolResult of step.toolResults) {
                        await logger.logStep({
                            stepType: "tool_result",
                            toolName: toolResult.toolName,
                            output: 'result' in toolResult ? toolResult.result : undefined,
                        });
                    }
                }
            },

            // 整体完成时记录
            onFinish: async () => {
                await logger.finishSession("completed");
            },

            // 错误处理
            onError: async (error) => {
                await logger.finishSession("error", String(error));
            },
        });

        // 返回 UI Message Stream Response
        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error("Chat API Error:", error);
        await logger.finishSession("error", String(error));
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
