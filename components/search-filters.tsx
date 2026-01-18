"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { X, Tag } from "lucide-react";
import type { SearchFacets } from "@/lib/search";

interface SearchFiltersProps {
    facets: SearchFacets;
}

export function SearchFilters({ facets }: SearchFiltersProps) {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();

    const currentFilters = searchParams.get("filters")?.split(",") || [];

    const toggleFilter = (tag: string) => {
        const params = new URLSearchParams(searchParams);
        const filters = new Set(currentFilters);

        if (filters.has(tag)) {
            filters.delete(tag);
        } else {
            filters.add(tag);
        }

        if (filters.size > 0) {
            params.set("filters", Array.from(filters).join(","));
        } else {
            params.delete("filters");
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    if (facets.categories.length === 0 && facets.tags.length === 0) return null;

    // Merge categories and tags into a single unified list
    const unifiedFacets = [
        ...facets.categories.map(c => ({
            name: c.name,
            count: c.count,
            type: 'category' as const,
            color: null
        })),
        ...facets.tags.map(t => ({
            name: t.name,
            count: t.count,
            type: 'tag' as const,
            color: t.color
        }))
    ].sort((a, b) => b.count - a.count); // Sort all by count descending

    return (
        <div className="space-y-4 mb-8">
            {/* Selected Filters */}
            {currentFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-muted-foreground self-center mr-2">已选:</span>
                    {currentFilters.map((filter) => (
                        <Badge
                            key={filter}
                            variant="default"
                            className="pl-3 pr-1 py-1 cursor-pointer hover:bg-primary/90"
                            onClick={() => toggleFilter(filter)}
                        >
                            {filter}
                            <X className="ml-1 h-3 w-3" />
                        </Badge>
                    ))}
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(searchParams);
                            params.delete("filters");
                            replace(`${pathname}?${params.toString()}`, { scroll: false });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline self-center ml-2"
                    >
                        清除全部
                    </button>
                </div>
            )}

            {/* Unified Facets List */}
            <div className="flex flex-wrap gap-2">
                {unifiedFacets.map((item) => {
                    const isActive = currentFilters.includes(item.name);
                    return (
                        <Badge
                            key={item.name}
                            variant={isActive ? "default" : "secondary"}
                            className={`cursor-pointer transition-all border ${isActive
                                    ? "border-transparent"
                                    : "bg-background hover:bg-secondary/50 border-input text-foreground hover:border-primary/30"
                                }`}
                            onClick={() => toggleFilter(item.name)}
                        >
                            {item.name}
                            <span className="ml-1.5 opacity-50 text-[10px] font-normal">
                                {item.count}
                            </span>
                        </Badge>
                    );
                })}
            </div>
        </div>
    );
}
