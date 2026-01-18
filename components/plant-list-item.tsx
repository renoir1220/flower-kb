"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface PlantListItemProps {
    id: number;
    name: string;
}

export function PlantListItem({
    id,
    name,
}: PlantListItemProps) {
    return (
        <Link href={`/plant/${id}`} className="block group">
            <div className="flex items-center justify-between py-3 border-b border-border/40 group-hover:bg-primary/5 px-3 -mx-3 rounded-lg transition-colors">
                <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex-1 mr-4 break-words">
                    {name}
                </span>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
        </Link>
    );
}
