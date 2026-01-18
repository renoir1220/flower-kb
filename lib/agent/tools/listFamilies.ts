/**
 * 列出分类工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { families, genera } from "@/db/schema";
import { eq } from "drizzle-orm";

export const listFamilies = tool({
    description: "列出知识库中所有的植物科/属分类",
    inputSchema: z.object({
        includeGenera: z.boolean().optional().describe("是否包含属信息，默认为 true"),
    }),
    execute: async ({ includeGenera = true }) => {
        const allFamilies = await db.select().from(families);

        if (!includeGenera) {
            return {
                success: true,
                count: allFamilies.length,
                families: allFamilies.map(f => ({
                    id: f.id,
                    name: f.name,
                    latinName: f.latinName,
                })),
            };
        }

        // 获取每个科下的属
        const result = await Promise.all(
            allFamilies.map(async (family) => {
                const generaList = await db
                    .select()
                    .from(genera)
                    .where(eq(genera.familyId, family.id));

                return {
                    id: family.id,
                    name: family.name,
                    latinName: family.latinName,
                    genera: generaList.map(g => ({
                        id: g.id,
                        name: g.name,
                        latinName: g.latinName,
                    })),
                };
            })
        );

        return {
            success: true,
            count: allFamilies.length,
            families: result,
        };
    },
});
