/**
 * 删除植物工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, careGuides, plantTags } from "@/db/schema";
import { eq } from "drizzle-orm";

export const deletePlant = tool({
    description: "删除植物词条。这是一个破坏性操作，会永久删除植物及其所有关联数据（养护指南、标签等）。请务必在用户明确要求删除时才调用。",
    inputSchema: z.object({
        plantId: z.number().describe("要删除的植物ID"),
        confirmName: z.string().describe("为了确认删除，请再次提供植物的中文名称"),
    }),
    execute: async ({ plantId, confirmName }) => {
        // 1. 检查植物是否存在
        const [existingPlant] = await db
            .select()
            .from(plants)
            .where(eq(plants.id, plantId))
            .limit(1);

        if (!existingPlant) {
            return { success: false, message: `ID为 ${plantId} 的植物不存在` };
        }

        // 简单的名称校验，防止误删
        if (existingPlant.name !== confirmName) {
            return {
                success: false,
                message: `名称不匹配。待删除植物名称为"${existingPlant.name}"，但提供的确认名称为"${confirmName}"。删除操作已取消。`
            };
        }

        try {
            // 2. 删除关联数据 (手动级联删除，通过事务保证原子性)
            await db.transaction(async (tx) => {
                // 删除养护指南
                await tx.delete(careGuides).where(eq(careGuides.plantId, plantId));

                // 删除标签关联
                await tx.delete(plantTags).where(eq(plantTags.plantId, plantId));

                // 删除植物本身
                await tx.delete(plants).where(eq(plants.id, plantId));
            });

            return {
                success: true,
                message: `成功删除了植物"${existingPlant.name}"及其所有关联数据`,
                deletedPlantId: plantId,
                deletedPlantName: existingPlant.name,
            };
        } catch (error) {
            console.error("Delete plant error:", error);
            return {
                success: false,
                message: `删除植物"${existingPlant.name}"时发生错误，请稍后重试`
            };
        }
    },
});
