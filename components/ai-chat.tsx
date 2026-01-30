"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Send, X, Bot, User, Sparkles, Search, Database, Wand2, Stethoscope, List, Maximize2, Square } from "lucide-react";
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

// 共享的聊天状态类型
interface ChatState {
  messages: UIMessage[];
  sendMessage: (params: { text: string }) => void;
  stop: () => void;
  status: "ready" | "submitted" | "streaming" | "error";
  isLoading: boolean;
}

interface AIChatProps {
  type?: "page" | "widget" | "fullscreen";
  showBackLink?: boolean;
  initialMessage?: string | null;
  onMessageSent?: () => void;
  onClose?: () => void;
  onFullscreen?: () => void;
  // 可选：外部传入的聊天状态（用于共享上下文）
  chatState?: ChatState;
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

// 思考状态指示器组件
function ThinkingIndicator({ status }: { status: { label: string; icon: React.ReactNode } }) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-secondary/50 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>{status.label}</span>
        </div>
      </div>
    </div>
  );
}

// 内部 hook：使用自己的聊天状态
function useInternalChat() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });
  const isLoading = status === "streaming" || status === "submitted";
  return { messages, sendMessage, status, isLoading, stop };
}

export function AIChat({
  type = "page",
  showBackLink = true,
  initialMessage,
  onMessageSent,
  onClose,
  onFullscreen,
  chatState: externalChatState
}: AIChatProps) {
  // 如果外部传入了 chatState，使用外部的；否则使用内部的
  const internalChatState = useInternalChat();
  const { messages, sendMessage, status, isLoading, stop } = externalChatState || internalChatState;

  const [input, setInput] = useState("");
  const initialMessageSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // 当消息变化或状态变化时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  // 处理初始消息（从外部触发的自动发送）
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && status === "ready") {
      initialMessageSentRef.current = true;
      sendMessage({ text: initialMessage });
      onMessageSent?.();
    }
  }, [initialMessage, status, sendMessage, onMessageSent]);

  // 获取当前正在执行的工具状态
  const getActiveToolStatus = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role !== "assistant") continue;
      for (let j = (message.parts?.length || 0) - 1; j >= 0; j -= 1) {
        const part = message.parts?.[j];

        // 兼容性检测：检查 part 类型
        const isTool = part?.type === "tool-invocation" || part?.type?.startsWith?.("tool-");

        if (isTool) {
          const toolPart = part as { toolName?: string; state?: string; type: string };
          // 只要不是 result 状态，就认为正在进行
          if (toolPart.state !== "result") {
            const toolName = toolPart.toolName || "";
            let toolLabel = "处理中";
            if (toolName && TOOL_LABELS[toolName]) {
              toolLabel = TOOL_LABELS[toolName].label;
            } else if (toolName) {
              toolLabel = toolName; // 如果有name但没映射，显示name
            }

            return {
              label: `正在${toolLabel}...`,
              icon: TOOL_ICONS[toolName] || <Loader2 className="w-3 h-3 animate-spin" />,
            };
          }
        }
      }
    }
    return null;
  }, [messages]);

  // 获取思考状态
  const getThinkingStatus = useCallback(() => {
    if (!isLoading) return null;
    const toolStatus = getActiveToolStatus();
    if (toolStatus) return toolStatus;
    if (status === "submitted") {
      return { label: "正在发送...", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
    }
    return { label: "思考中...", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
  }, [isLoading, status, getActiveToolStatus]);

  const thinkingStatus = getThinkingStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  // 渲染消息
  const renderMessage = (message: UIMessage) => {
    const isUser = message.role === "user";
    const renderedParts: React.ReactNode[] = [];
    let hasToolInProgress = false;

    message.parts?.forEach((part, i) => {
      if (part.type === "text" && part.text?.trim()) {
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
      }
      // 兼容性检测
      const isTool = part?.type === "tool-invocation" || part?.type?.startsWith?.("tool-");
      if (isTool) {
        const toolPart = part as { toolName?: string; state?: string };
        // state 不是 result 表示工具正在执行
        if (toolPart.state !== "result") {
          hasToolInProgress = true;
        }
      }
    });

    if (renderedParts.length === 0 && !isUser) {
      return null;
    }

    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary/50"}`}>
          {renderedParts}
          {hasToolInProgress && thinkingStatus && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{thinkingStatus.label}</span>
              </div>
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

  const shouldShowBottomIndicator = isLoading && thinkingStatus && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === "user" ||
    !messages.some(m => m.role === "assistant" && m.parts?.some(p => p.type === "text" && p.text?.trim()))
  );

  const renderedMessages = messages.map(renderMessage).filter(Boolean);

  // Widget 变体
  if (type === "widget") {
    return (
      <div className="flex flex-col h-full">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 ? <EmptyState onSuggestion={setInput} /> : renderedMessages}
          {shouldShowBottomIndicator && thinkingStatus && <ThinkingIndicator status={thinkingStatus} />}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题..."
              className="flex-1 px-4 py-2 rounded-xl border bg-background text-sm"
            />
            {isLoading ? (
              <Button type="button" size="icon" variant="destructive" onClick={() => stop()}>
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // 全屏变体
  if (type === "fullscreen") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <header className="border-b h-14 flex items-center px-4 md:px-6 justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold">FlowerKB 助手</h1>
              <p className="text-xs text-muted-foreground">智能植物养护顾问</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
            {messages.length === 0 ? <EmptyState onSuggestion={setInput} /> : renderedMessages}
            {shouldShowBottomIndicator && thinkingStatus && <ThinkingIndicator status={thinkingStatus} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
            {isLoading ? (
              <Button type="button" size="lg" variant="destructive" onClick={() => stop()} className="px-6">
                <Square className="w-5 h-5" />
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={!input.trim()} className="px-6">
                <Send className="w-5 h-5" />
              </Button>
            )}
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? <EmptyState onSuggestion={setInput} /> : renderedMessages}
          {shouldShowBottomIndicator && thinkingStatus && <ThinkingIndicator status={thinkingStatus} />}
          <div ref={messagesEndRef} />
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
          />
          {isLoading ? (
            <Button type="button" size="lg" variant="destructive" onClick={() => stop()}>
              <Square className="w-5 h-5" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={!input.trim()}>
              <Send className="w-5 h-5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

// Widget 入口 - 共享聊天状态
export function AIChatWidget({ hideOnRoutes = ["/ai", "/esse"] }: { hideOnRoutes?: string[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const previousPathnameRef = useRef(pathname);

  // 在 Widget 层级管理聊天状态，这样切换模式时可以保持上下文
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });
  const isLoading = status === "streaming" || status === "submitted";
  const chatState: ChatState = { messages, sendMessage, status, isLoading, stop };

  // 处理初始消息
  const initialMessageSentRef = useRef(false);
  useEffect(() => {
    if (pendingMessage && !initialMessageSentRef.current && status === "ready") {
      initialMessageSentRef.current = true;
      sendMessage({ text: pendingMessage });
      setPendingMessage(null);
    }
  }, [pendingMessage, status, sendMessage]);

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
    if (previousPathname !== pathname && isMobile && isOpen && !isFullscreen) {
      queueMicrotask(() => setIsOpen(false));
    }
    previousPathnameRef.current = pathname;
  }, [isMobile, isOpen, isFullscreen, pathname]);

  useEffect(() => {
    const handleOpenChat = (e: CustomEvent<{ message: string }>) => {
      setPendingMessage(e.detail.message);
      initialMessageSentRef.current = false; // 重置标志以允许新消息发送
      setIsOpen(true);
    };
    window.addEventListener("openChatWithMessage", handleOpenChat as EventListener);
    return () => window.removeEventListener("openChatWithMessage", handleOpenChat as EventListener);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (hideOnRoutes.some((r) => pathname.startsWith(r))) return null;

  // 全屏模式
  if (isFullscreen) {
    return (
      <AIChat
        type="fullscreen"
        showBackLink={false}
        chatState={chatState}
        onClose={() => {
          setIsFullscreen(false);
          setIsOpen(false);
        }}
      />
    );
  }

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
                : "w-[380px] h-[560px] rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col"
            }
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">FlowerKB 助手</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(true)}
                  className="hover:bg-primary/10"
                  title="全屏模式"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <AIChat
                type="widget"
                showBackLink={false}
                chatState={chatState}
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
