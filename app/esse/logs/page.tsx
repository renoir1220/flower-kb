import { db } from "@/db";
import { agentSessions, agentSteps } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 格式化时间
function formatDateTime(date: Date | null) {
    if (!date) return "-";
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

// 格式化耗时
function formatDuration(ms: number | null) {
    if (ms == null) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// 步骤类型标签
function StepTypeBadge({ type }: { type: string }) {
    const variants: Record<string, { label: string; className: string }> = {
        llm_response: { label: "LLM", className: "bg-blue-500/20 text-blue-400" },
        tool_call: { label: "调用", className: "bg-amber-500/20 text-amber-400" },
        tool_result: { label: "结果", className: "bg-green-500/20 text-green-400" },
    };
    const v = variants[type] || { label: type, className: "" };
    return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

// 状态标签
function StatusBadge({ status }: { status: string | null }) {
    const variants: Record<string, { className: string }> = {
        running: { className: "bg-yellow-500/20 text-yellow-400" },
        completed: { className: "bg-green-500/20 text-green-400" },
        error: { className: "bg-red-500/20 text-red-400" },
    };
    const v = variants[status || ""] || { className: "" };
    return <Badge variant="outline" className={v.className}>{status || "-"}</Badge>;
}

export default async function AgentLogsPage({
    searchParams,
}: {
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const params = await searchParams;
    const selectedSessionId = params.sessionId;

    // 获取最近的会话
    const sessions = await db
        .select()
        .from(agentSessions)
        .orderBy(desc(agentSessions.startedAt))
        .limit(50);

    // 如果选中了某个会话，获取其步骤
    let steps: (typeof agentSteps.$inferSelect)[] = [];
    if (selectedSessionId) {
        steps = await db
            .select()
            .from(agentSteps)
            .where(eq(agentSteps.sessionId, selectedSessionId))
            .orderBy(agentSteps.stepNumber);
    }

    return (
        <div>
            <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
                <div className="px-6 py-4">
                    <h1 className="text-2xl font-semibold">Agent 执行日志</h1>
                    <p className="text-sm text-muted-foreground">查看 Agent 执行过程，分析性能瓶颈</p>
                </div>
            </div>

            <div className="px-6 py-10">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* 会话列表 */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>会话列表</CardTitle>
                                <CardDescription>最近 50 个 Agent 会话</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/40 max-h-[600px] overflow-auto">
                                    {sessions.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-sm">
                                            暂无执行记录
                                        </div>
                                    ) : (
                                        sessions.map((session) => (
                                            <a
                                                key={session.id}
                                                href={`?sessionId=${session.id}`}
                                                className={[
                                                    "block p-4 transition-colors hover:bg-secondary/30",
                                                    selectedSessionId === session.id ? "bg-secondary/50" : "",
                                                ].join(" ")}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium truncate">
                                                        {formatDateTime(session.startedAt)}
                                                    </span>
                                                    <StatusBadge status={session.status} />
                                                </div>
                                                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>{session.totalSteps || 0} 步</span>
                                                    <span>{formatDuration(session.totalDurationMs)}</span>
                                                    <span>
                                                        {(session.totalPromptTokens || 0) + (session.totalCompletionTokens || 0)} tokens
                                                    </span>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 步骤详情 */}
                    <div className="lg:col-span-2">
                        {selectedSessionId ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>执行步骤</CardTitle>
                                    <CardDescription>
                                        会话 ID: {selectedSessionId.slice(0, 20)}...
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40 max-h-[600px] overflow-auto">
                                        {steps.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground text-sm">
                                                暂无步骤记录
                                            </div>
                                        ) : (
                                            steps.map((step) => (
                                                <div key={step.id} className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            #{step.stepNumber}
                                                        </span>
                                                        <StepTypeBadge type={step.stepType} />
                                                        {step.toolName && (
                                                            <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">
                                                                {step.toolName}
                                                            </code>
                                                        )}
                                                        <span className="ml-auto text-xs text-muted-foreground">
                                                            {formatDuration(step.durationMs)}
                                                        </span>
                                                    </div>

                                                    {/* Token 统计 */}
                                                    {(step.promptTokens || step.completionTokens) && (
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            Tokens: {step.promptTokens || 0} → {step.completionTokens || 0}
                                                        </div>
                                                    )}

                                                    {/* Reasoning */}
                                                    {step.reasoning && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                                Reasoning
                                                            </summary>
                                                            <pre className="mt-1 p-2 bg-secondary/30 rounded text-xs overflow-auto max-h-40">
                                                                {step.reasoning}
                                                            </pre>
                                                        </details>
                                                    )}

                                                    {/* Input */}
                                                    {step.input && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                                Input
                                                            </summary>
                                                            <pre className="mt-1 p-2 bg-secondary/30 rounded text-xs overflow-auto max-h-40">
                                                                {JSON.stringify(JSON.parse(step.input), null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}

                                                    {/* Output */}
                                                    {step.output && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                                Output
                                                            </summary>
                                                            <pre className="mt-1 p-2 bg-secondary/30 rounded text-xs overflow-auto max-h-40">
                                                                {JSON.stringify(JSON.parse(step.output), null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}

                                                    {/* Error */}
                                                    {step.error && (
                                                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                                            {step.error}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="py-20 text-center text-muted-foreground">
                                    <p>← 选择一个会话查看详情</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
