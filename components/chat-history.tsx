
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

export function ChatHistory({
    currentId,
    onSelect
}: {
    currentId?: string | null;
    onSelect?: (id: string) => void;
}) {
    const [history, setHistory] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, [currentId]); // Refresh when ID changes (new chat created)

    async function fetchHistory() {
        try {
            const res = await fetch("/api/agent/history");
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r w-64">
            <div className="p-4 border-b">
                <Button
                    className="w-full justify-start gap-2"
                    variant="outline"
                    onClick={() => {
                        router.push("/ai");
                        onSelect?.("");
                    }}
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="text-sm text-muted-foreground p-4">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4">No history yet.</div>
                ) : (
                    history.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => {
                                router.push(`/ai?c=${chat.id}`);
                                onSelect?.(chat.id);
                            }}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                                currentId === chat.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-slate-100 text-slate-700"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                            <span className="truncate">{chat.title}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
