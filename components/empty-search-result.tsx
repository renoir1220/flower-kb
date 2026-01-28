"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface EmptySearchResultProps {
    query: string;
}

export function EmptySearchResult({ query }: EmptySearchResultProps) {
    const handleCreate = () => {
        // 触发自定义事件，让 AIChatWidget 展开并发送消息
        const event = new CustomEvent("openChatWithMessage", {
            detail: { message: `新增植物：${query}` },
        });
        window.dispatchEvent(event);
    };

    return (
        <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
                未找到「<span className="text-foreground font-medium">{query}</span>」的相关结果
            </p>
            <Button variant="outline" onClick={handleCreate} className="gap-2">
                <PlusCircle className="w-4 h-4" />
                新建词条
            </Button>
        </div>
    );
}
