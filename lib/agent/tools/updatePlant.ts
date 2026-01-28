/**
 * 更新植物工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, careGuides } from "@/db/schema";
import { eq } from "drizzle-orm";

export const updatePlant = tool({
    description: "更新现有植物的信息，包括基本信息和养护指南。仅更新提供的字段，未提供的字段保持不变。",
    inputSchema: z.object({
        plantId: z.number().describe("要更新的植物ID"),
        basicInfo: z.object({
            name: z.string().optional().describe("植物中文名"),
            englishName: z.string().optional().describe("英文名"),
            latinName: z.string().optional().describe("拉丁学名"),
            aliases: z.string().optional().describe("别名（逗号分隔）"),
            description: z.string().optional().describe("植物简介"),
            difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("养护难度"),
            genusId: z.number().optional().describe("所属属ID"),
        }).optional().describe("要更新的基本信息字段"),
        careGuide: z.object({
            soil: z.string().optional(),
            temperature: z.string().optional(),
            light: z.string().optional(),
            watering: z.string().optional(),
            humidity: z.string().optional(),
            fertilizing: z.string().optional(),
            pestControl: z.string().optional(),
            pruning: z.string().optional(),
            postBloom: z.string().optional(),
            propagation: z.string().optional(),
            notes: z.string().optional(),
        }).optional().describe("要更新的养护指南字段"),
    }),
    execute: async ({ plantId, basicInfo, careGuide }) => {
        // 1. 检查植物是否存在
        const [existingPlant] = await db
            .select()
            .from(plants)
            .where(eq(plants.id, plantId))
            .limit(1);

        if (!existingPlant) {
            return { success: false, message: `ID为 ${plantId} 的植物不存在` };
        }

        let updatedPlant = null;
        let updatedCareGuide = null;

        // 2. 更新基本信息
        if (basicInfo && Object.keys(basicInfo).length > 0) {
            try {
                const [res] = await db
                    .update(plants)
                    .set({
                        ...basicInfo,
                        updatedAt: new Date(), // Use Date object
                    })
                    .where(eq(plants.id, plantId))
                    .returning();
                updatedPlant = res;
            } catch (error) {
                console.error("Update plant error:", error);
                return { success: false, message: "更新植物基本信息失败" };
            }
        }

        // 3. 更新养护指南
        if (careGuide && Object.keys(careGuide).length > 0) {
            // 检查是否已有养护指南
            const [existingGuide] = await db
                .select()
                .from(careGuides)
                .where(eq(careGuides.plantId, plantId))
                .limit(1);

            try {
                if (existingGuide) {
                    const [res] = await db
                        .update(careGuides)
                        .set(careGuide)
                        .where(eq(careGuides.plantId, plantId))
                        .returning();
                    updatedCareGuide = res;
                } else {
                    const [res] = await db
                        .insert(careGuides)
                        .values({
                            plantId,
                            ...careGuide
                        })
                        .returning();
                    updatedCareGuide = res;
                }
            } catch (error) {
                console.error("Update care guide error:", error);
                return { success: false, message: "更新养护指南失败" };
            }
        }

        return {
            success: true,
            message: `成功更新植物"${updatedPlant?.name || existingPlant.name}"的信息，请刷新页面查看最新内容`,
            updatedFields: {
                basicInfo: basicInfo ? Object.keys(basicInfo) : [],
                careGuide: careGuide ? Object.keys(careGuide) : [],
            },
            link: `/plant/${plantId}`,
        };
    },
});
