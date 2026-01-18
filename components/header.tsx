"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { Suspense } from "react";

function HeaderContent() {
    const searchParams = useSearchParams();
    const hasQuery = searchParams.has("q") && searchParams.get("q") !== "";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className={`container mx-auto px-6 h-16 flex items-center ${hasQuery ? 'gap-4' : 'justify-between'}`}>
                {/* Logo Section - Always visible but maybe simplified on mobile if searching */}
                <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
                        <Leaf className="h-5 w-5" />
                    </div>
                    {/* Hide Text on small screens if searching to make room */}
                    <div className={hasQuery ? "hidden md:block" : "block"}>
                        <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            FlowerKB
                        </h1>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">
                            植物养护知识库
                        </p>
                    </div>
                </Link>

                {/* Center Search Bar - Only visible when searching */}
                {hasQuery && (
                    <div className="flex-1 max-w-xl mx-auto px-4">
                        <SearchBar variant="compact" />
                    </div>
                )}

                {/* Navigation */}
                <nav className={`flex items-center gap-6 flex-shrink-0 ${hasQuery ? '' : ''}`}>
                    <Link
                        href="/"
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        首页
                    </Link>
                    <Link
                        href="/explore"
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        探索
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export function Header() {
    return (
        <Suspense fallback={<div className="h-16 border-b border-border/40 bg-background/95" />}>
            <HeaderContent />
        </Suspense>
    );
}
