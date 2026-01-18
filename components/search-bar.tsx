"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    variant?: "default" | "compact";
}

export function SearchBar({ variant = "default" }: SearchBarProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace, push } = useRouter();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        // 搜索时重置筛选
        params.delete("filters");

        // Logic: If on home page ('/'), use replace to update current view.
        // If on detail page or elsewhere, push to home ('/') with params.
        if (pathname === "/") {
            replace(`${pathname}?${params.toString()}`);
        } else {
            push(`/?${params.toString()}`);
        }
    }, 300);

    const isCompact = variant === "compact";

    return (
        <div className={cn(
            "relative w-full mx-auto",
            isCompact ? "max-w-md" : "max-w-2xl"
        )}>
            <div className="relative">
                <Search className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50",
                    isCompact ? "h-4 w-4" : "h-5 w-5"
                )} />
                <Input
                    className={cn(
                        "w-full rounded-2xl bg-background transition-all focus-visible:ring-0",
                        isCompact
                            ? "h-10 pl-10 pr-4 text-sm border border-border/60 hover:border-primary/30"
                            : "h-14 pl-12 pr-4 text-lg border-2 border-primary/10 hover:border-primary/20 focus-visible:border-primary shadow-sm"
                    )}
                    placeholder={isCompact ? "搜索..." : "搜索植物名称、习性、或养护方法 （如：'室内 喜阴'）..."}
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get("q")?.toString()}
                />
            </div>
        </div>
    );
}
