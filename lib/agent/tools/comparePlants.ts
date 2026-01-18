/**
 * 植物对比工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, careGuides, families, genera, type CareGuide } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";

export const comparePlants = tool({
    description: "对比两种或多种植物的详细信息和养护要求。当用户询问“A和B有什么区别”、“如何区分A和B”或“A和B哪个更好养”时使用。",
    inputSchema: z.object({
        plantNames: z.array(z.string()).min(2).describe("要对比的植物名称列表，至少两个"),
    }),
    execute: async ({ plantNames }) => {
        // 查找所有植物
        const foundPlants: Array<{
            id: number;
            name: string;
            englishName: string | null;
            latinName: string | null;
            description: string | null;
            difficulty: "easy" | "medium" | "hard" | null;
            familyName: string;
            genusName: string;
            care: Partial<CareGuide>;
        }> = [];
        const notFoundNames = [];

        for (const name of plantNames) {
            const pattern = `%${name}%`;
            const plant = await db
                .select({
                    id: plants.id,
                    name: plants.name,
                    englishName: plants.englishName,
                    latinName: plants.latinName,
                    description: plants.description,
                    difficulty: plants.difficulty,
                    familyName: families.name,
                    genusName: genera.name,
                })
                .from(plants)
                .leftJoin(genera, eq(plants.genusId, genera.id))
                .leftJoin(families, eq(genera.familyId, families.id))
                .where(
                    or(
                        eq(plants.name, name),
                        like(plants.name, pattern),
                        like(plants.aliases, pattern)
                    )
                )
                .limit(1) // 每个名称只取最匹配的一个
                .get();

            if (plant) {
                // 获取养护指南
                const careGuide = await db
                    .select()
                    .from(careGuides)
                    .where(eq(careGuides.plantId, plant.id))
                    .get();

                foundPlants.push({
                    ...plant,
                    familyName: plant.familyName || "未知",
                    genusName: plant.genusName || "未知",
                    care: careGuide || {}, // 如果没有养护指南，提供空对象
                });
            } else {
                notFoundNames.push(name);
            }
        }

        if (foundPlants.length < 2) {
            return {
                success: false,
                message: `无法进行对比。找到的植物少于2个。${notFoundNames.length > 0 ? `未找到：${notFoundNames.join(", ")}` : ""}`,
                foundPlants: foundPlants.map(p => p.name),
            };
        }

        // 构造对比数据
        return {
            success: true,
            message: `找到 ${foundPlants.length} 种植物进行对比`,
            notFoundNames: notFoundNames.length > 0 ? notFoundNames : undefined,
            plants: foundPlants.map(p => ({
                id: p.id,
                name: p.name,
                classification: `${p.familyName} - ${p.genusName}`,
                difficulty: p.difficulty,
                care: {
                    light: p.care.light,
                    watering: p.care.watering,
                    temperature: p.care.temperature,
                    soil: p.care.soil,
                },
                description: p.description,
            })),
        };
    },
});
