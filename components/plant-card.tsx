"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Flower2, Leaf, TreeDeciduous, ArrowUpRight } from "lucide-react";

interface PlantCardProps {
    id: number;
    name: string;
    latinName?: string | null;
    familyName: string;
    genusName: string;
    difficulty: "easy" | "medium" | "hard";
    tags: { name: string; color: string }[];
}

const difficultyMap = {
    easy: { label: "新手", color: "text-emerald-600 bg-emerald-50", icon: Leaf },
    medium: { label: "进阶", color: "text-amber-600 bg-amber-50", icon: Flower2 },
    hard: { label: "专家", color: "text-rose-600 bg-rose-50", icon: TreeDeciduous },
};

export function PlantCard({
    id,
    name,
    latinName,
    familyName,
    genusName,
    difficulty,
    tags,
}: PlantCardProps) {
    const difficultyInfo = difficultyMap[difficulty] || difficultyMap.medium;

    return (
        <Link href={`/plant/${id}`} className="block group">
            <div className="relative h-full p-6 bg-background rounded-2xl border border-border/40 transition-all duration-300 hover:border-primary/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-primary/[0.02]">

                {/* Top: Header Info */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>{familyName}</span>
                        <span className="w-1 h-1 rounded-full bg-primary/30" />
                        <span>{genusName}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${difficultyInfo.color}`}>
                        {difficultyInfo.label}
                    </div>
                </div>

                {/* Middle: Title & Icon */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                            {name}
                        </h3>
                        {latinName && (
                            <p className="text-sm text-muted-foreground/60 font-serif italic mt-1">
                                {latinName}
                            </p>
                        )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <ArrowUpRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Bottom: Tags */}
                <div className="mt-auto flex flex-wrap gap-2">
                    {tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag.name}
                            className="text-xs px-2 py-0.5 rounded-md text-muted-foreground/70 bg-secondary/50 border border-transparent group-hover:border-primary/10 transition-colors"
                        >
                            #{tag.name}
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
}
