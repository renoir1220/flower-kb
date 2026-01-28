"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X, Bot, User, Sparkles, Search, Database, Wand2, Stethoscope, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { usePathname } from "next/navigation";
import { TOOL_LABELS } from "@/lib/agent/config";

// Tool Icons（与 TOOL_LABELS 配合使用）
const TOOL_ICONS: Record<string, React.ReactNode> = {
  searchPlant: <Search className="w-3 h-3" />,
  getPlantDetail: <Database className="w-3 h-3" />,
  createPlant: <Wand2 className="w-3 h-3" />,
  createTaxonomy: <Database className="w-3 h-3" />,
  updatePlant: <Wand2 className="w-3 h-3" />,
  deletePlant: <X className="w-3 h-3" />,
  searchByTag: <Search className="w-3 h-3" />,
  comparePlants: <Database className="w-3 h-3" />,
  getDiagnostics: <Stethoscope className="w-3 h-3" />,
  listFamilies: <List className="w-3 h-3" />,
};

interface AIChatProps {
  type?: "page" | "widget";
  showBackLink?: boolean;
  initialMessage?: string | null;
  onMessageSent?: () => void;
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
        <Bot className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold mb-2">FlowerKB 助手</h2>
      <p className="text-muted-foreground mb-6 text-sm">我可以帮你查询植物信息、创建词条。试着问我：</p>
      <div className="flex flex-wrap justify-center gap-2">
        {["蝴蝶兰怎么养", "帮我查一下绿萝", "添加一个新植物"].map((s) => (
          <button key={s} onClick={() => onSuggestion(s)} className="px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm">{s}</button>
        ))}
      </div>
    </div>
  );
}

export function AIChat({ type = "page", showBackLink = true, initialMessage, onMessageSent }: AIChatProps) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });

  const [input, setInput] = useState("");
  const initialMessageSentRef = useRef(false);

  // 处理初始消息（从外部触发的自动发送）
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && status === "ready") {
      initialMessageSentRef.current = true;
      sendMessage({ text: initialMessage });
      onMessageSent?.();
    }
  }, [initialMessage, status, sendMessage, onMessageSent]);
  const isLoading = status === "streaming" || status === "submitted";
  const lastAssistantMessageId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  const getPendingToolStatus = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role !== "assistant") continue;
      for (let j = (message.parts?.length || 0) - 1; j >= 0; j -= 1) {
        const part = message.parts?.[j];
        if (!part || !part.type?.startsWith?.("tool-")) continue;
        const toolPart = part as { toolName?: string; state?: string };
        if (toolPart.state !== "call" && toolPart.state !== "streaming") continue;
        const toolName = toolPart.toolName || "";
        return {
          label: TOOL_LABELS[toolName]?.label || "处理中...",
          icon: TOOL_ICONS[toolName] || <Loader2 className="w-3 h-3 animate-spin" />,
        };
      }
    }
    return null;
  };

  const getThinkingStatus = () => {
    if (!isLoading) return null;
    if (status === "submitted") {
      return { label: "正在发送...", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
    }
    const pendingTool = getPendingToolStatus();
    if (pendingTool) {
      return { label: pendingTool.label, icon: pendingTool.icon };
    }
    return { label: "思考中...", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
  };

  const thinkingStatus = getThinkingStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  // 渲染消息
  const renderMessage = (message: typeof messages[0]) => {
    const isUser = message.role === "user";
    const renderedParts: React.ReactNode[] = [];

    message.parts?.forEach((part, i) => {
      if (part.type === "text") {
        renderedParts.push(
          <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <Link href={href || "#"} className="text-primary underline">{children}</Link>
                ),
              }}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        );
        return;
      }
      if (part.type?.startsWith?.("tool-")) {
        const toolPart = part as { toolName?: string; state?: string };
        const toolName = toolPart.toolName || "";
        const toolInfo = TOOL_LABELS[toolName];
        const toolIcon = TOOL_ICONS[toolName];
        if (toolPart.state === "call" || toolPart.state === "streaming") {
          renderedParts.push(
            <div key={i} className="text-xs text-muted-foreground flex items-center gap-2 my-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {toolIcon} {toolInfo?.label || "处理中..."}
            </div>
          );
        }
      }
    });

    const shouldShowThinkingFallback = !isUser && isLoading && message.id === lastAssistantMessageId && renderedParts.length === 0;

    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary/50"}`}>
          {renderedParts.length > 0 && renderedParts}
          {shouldShowThinkingFallback && thinkingStatus && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {thinkingStatus.icon}
              <span>{thinkingStatus.label}</span>
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  // Widget 变体
  if (type === "widget") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 ? <EmptyState onSuggestion={setInput} /> : messages.map(renderMessage)}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && thinkingStatus && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-secondary/50 rounded-2xl px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                {thinkingStatus.icon}
                <span>{thinkingStatus.label}</span>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题..."
              className="flex-1 px-4 py-2 rounded-xl border bg-background text-sm"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Page 变体
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <header className="border-b h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-base font-bold">FlowerKB 助手</h1>
        </div>
        {showBackLink && <Link href="/"><Button variant="ghost" size="sm">返回首页</Button></Link>}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? <EmptyState onSuggestion={setInput} /> : messages.map(renderMessage)}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && thinkingStatus && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div>
              <div className="bg-secondary/50 rounded-2xl px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                {thinkingStatus.icon}
                <span>{thinkingStatus.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-3 rounded-xl border bg-background"
            disabled={isLoading}
          />
          <Button type="submit" size="lg" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Widget 入口
export function AIChatWidget({ hideOnRoutes = ["/ai", "/esse"] }: { hideOnRoutes?: string[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateIsMobile = () => {
      const nextIsMobile = mediaQuery.matches;
      queueMicrotask(() => setIsMobile(nextIsMobile));
    };
    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    if (previousPathname !== pathname && isMobile && isOpen) {
      // 通过微任务关闭，避免 lint 规则对 effect 内直接 setState 的限制
      queueMicrotask(() => setIsOpen(false));
    }
    previousPathnameRef.current = pathname;
  }, [isMobile, isOpen, pathname]);

  // 监听自定义事件，打开聊天并发送消息
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent<{ message: string }>) => {
      setPendingMessage(e.detail.message);
      setIsOpen(true);
    };
    window.addEventListener("openChatWithMessage", handleOpenChat as EventListener);
    return () => window.removeEventListener("openChatWithMessage", handleOpenChat as EventListener);
  }, []);

  if (hideOnRoutes.some((r) => pathname.startsWith(r))) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <>
          {isMobile && (
            <button
              aria-label="关闭对话框遮罩"
              className="fixed inset-0 bg-black/30"
              onClick={() => setIsOpen(false)}
            />
          )}
          <div
            className={
              isMobile
                ? "fixed inset-x-0 bottom-0 h-[85dvh] max-h-[85dvh] rounded-t-2xl border-t bg-background shadow-2xl overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]"
                : "w-[360px] h-[520px] rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col"
            }
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">FlowerKB 助手</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 min-h-0">
              <AIChat
                type="widget"
                showBackLink={false}
                initialMessage={pendingMessage}
                onMessageSent={() => setPendingMessage(null)}
              />
            </div>
          </div>
        </>
      )}
      <Button
        size="icon"
        className={`h-12 w-12 rounded-full shadow-lg ${isMobile && isOpen ? "hidden" : ""}`}
        onClick={() => setIsOpen((p) => !p)}
      >
        <Sparkles className="w-5 h-5" />
      </Button>
    </div>
  );
}
