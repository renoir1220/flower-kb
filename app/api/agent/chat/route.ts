/**
 * Agent Chat API Route
 * 基于 AI SDK 官方文档的简洁实现
 */
import { createAgent, SYSTEM_PROMPT } from "@/lib/agent";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        // 初始化 Agent
        const agent = await createAgent();
        const model = agent.getModel();
        const tools = agent.getTools();

        // 转换消息格式并调用 LLM
        const result = streamText({
            model: model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages),
            tools: tools,
            stopWhen: stepCountIs(10), // 最多 10 步工具调用
        });

        // 返回 UI Message Stream Response
        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error("Chat API Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
