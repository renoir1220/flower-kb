"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Tag {
    id: number;
    name: string;
    category: string;
    color: string;
}

interface CategoryNavProps {
    tags: Tag[];
    selectedTag?: number | null;
    onSelectTag?: (tagId: number | null) => void;
}

const categoryLabels: Record<string, string> = {
    type: "植物类型",
    scene: "适用场景",
    feature: "特性标签",
};

export function CategoryNav({ tags, selectedTag, onSelectTag }: CategoryNavProps) {
    // 按 category 分组
    const groupedTags = tags.reduce(
        (acc, tag) => {
            const category = tag.category || "other";
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        },
        {} as Record<string, Tag[]>
    );

    return (
        <div className="space-y-6">
            {Object.entries(groupedTags).map(([category, categoryTags]) => (
                <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        {categoryLabels[category] || category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {categoryTags.map((tag) => (
                            <Badge
                                key={tag.id}
                                variant={selectedTag === tag.id ? "default" : "outline"}
                                className={cn(
                                    "cursor-pointer transition-all hover:scale-105",
                                    selectedTag === tag.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-accent"
                                )}
                                style={
                                    selectedTag !== tag.id
                                        ? {
                                            borderColor: `${tag.color}50`,
                                            color: tag.color,
                                        }
                                        : undefined
                                }
                                onClick={() => {
                                    onSelectTag?.(selectedTag === tag.id ? null : tag.id);
                                }}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
