/**
 * 按标签搜索植物工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, tags, plantTags, families, genera } from "@/db/schema";
import { eq, like, inArray } from "drizzle-orm";

export const searchByTag = tool({
    description: "通过标签搜索植物，例如'观花类'、'室内盆栽'、'新手友好'等。当用户询问“推荐一些好养的植物”或“有哪些室内植物”时非常有用。",
    inputSchema: z.object({
        tagName: z.string().describe("标签名称或关键词"),
    }),
    execute: async ({ tagName }) => {
        // 1. 查找匹配的标签
        const matchedTags = await db
            .select()
            .from(tags)
            .where(like(tags.name, `%${tagName}%`));

        if (matchedTags.length === 0) {
            // 获取所有标签供参考
            const allTags = await db.select({ name: tags.name }).from(tags).limit(20);
            return {
                found: false,
                message: `未找到包含"${tagName}"的标签`,
                availableTags: allTags.map(t => t.name),
            };
        }

        const tagIds = matchedTags.map(t => t.id);

        // 2. 查找关联植物
        const plantTagRelations = await db
            .select()
            .from(plantTags)
            .where(inArray(plantTags.tagId, tagIds));

        const plantIds = plantTagRelations.map(r => r.plantId);

        // 去重
        const uniquePlantIds = Array.from(new Set(plantIds));

        if (uniquePlantIds.length === 0) {
            return {
                found: true,
                count: 0,
                tags: matchedTags.map(t => t.name),
                message: `找到标签"${matchedTags.map(t => t.name).join(', ')}"，但该标签下暂无植物数据`,
            };
        }

        const results = await db
            .select({
                id: plants.id,
                name: plants.name,
                englishName: plants.englishName,
                latinName: plants.latinName,
                description: plants.description,
                familyName: families.name,
                genusName: genera.name,
            })
            .from(plants)
            .leftJoin(genera, eq(plants.genusId, genera.id))
            .leftJoin(families, eq(genera.familyId, families.id))
            .where(inArray(plants.id, uniquePlantIds));

        return {
            found: true,
            count: results.length,
            tags: matchedTags.map(t => t.name),
            plants: results.map(p => ({
                id: p.id,
                name: p.name,
                englishName: p.englishName,
                latinName: p.latinName,
                family: p.familyName,
                genus: p.genusName,
                link: `/plant/${p.id}`,
            })),
        };
    },
});
