/**
 * 搜索植物工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, genera, families } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";

export const searchPlant = tool({
    description: "搜索植物知识库，根据植物名称或关键词查找植物信息",
    inputSchema: z.object({
        query: z.string().describe("搜索关键词，可以是植物名称、别名、英文名等"),
    }),
    execute: async ({ query }) => {
        const pattern = `%${query}%`;
        const results = await db
            .select({
                id: plants.id,
                name: plants.name,
                englishName: plants.englishName,
                latinName: plants.latinName,
                aliases: plants.aliases,
                description: plants.description,
                familyName: families.name,
                genusName: genera.name,
            })
            .from(plants)
            .leftJoin(genera, eq(plants.genusId, genera.id))
            .leftJoin(families, eq(genera.familyId, families.id))
            .where(
                or(
                    like(plants.name, pattern),
                    like(plants.englishName, pattern),
                    like(plants.latinName, pattern),
                    like(plants.aliases, pattern)
                )
            )
            .limit(5);

        if (results.length === 0) {
            return {
                found: false,
                message: `未找到与「${query}」相关的植物`,
                canCreate: true,
                suggestedName: query,
            };
        }

        return {
            found: true,
            count: results.length,
            plants: results.map(p => ({
                id: p.id,
                name: p.name,
                englishName: p.englishName,
                latinName: p.latinName,
                aliases: p.aliases,
                description: p.description,
                family: p.familyName,
                genus: p.genusName,
                link: `/plant/${p.id}`,
            })),
        };
    },
});
