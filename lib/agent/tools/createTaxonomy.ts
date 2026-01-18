/**
 * 创建分类工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { families, genera } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createTaxonomy = tool({
    description: "创建植物分类（科和属）。仅当用户明确同意创建分类时才调用此工具。",
    inputSchema: z.object({
        familyName: z.string().describe("科名（中文）"),
        familyLatinName: z.string().optional().describe("科的拉丁名"),
        genusName: z.string().describe("属名（中文）"),
        genusLatinName: z.string().optional().describe("属的拉丁名"),
    }),
    execute: async ({ familyName, familyLatinName, genusName, genusLatinName }) => {
        // 检查或创建科
        let [targetFamily] = await db
            .select()
            .from(families)
            .where(eq(families.name, familyName))
            .limit(1);

        if (!targetFamily) {
            [targetFamily] = await db
                .insert(families)
                .values({
                    name: familyName,
                    latinName: familyLatinName || null,
                })
                .returning();
        }

        // 检查或创建属
        let [targetGenus] = await db
            .select()
            .from(genera)
            .where(eq(genera.name, genusName))
            .limit(1);

        if (!targetGenus) {
            [targetGenus] = await db
                .insert(genera)
                .values({
                    name: genusName,
                    latinName: genusLatinName || null,
                    familyId: targetFamily.id,
                })
                .returning();
        }

        return {
            success: true,
            message: `成功创建分类：${familyName} - ${genusName}`,
            taxonomy: {
                familyId: targetFamily.id,
                familyName: targetFamily.name,
                genusId: targetGenus.id,
                genusName: targetGenus.name,
            },
        };
    },
});
