/**
 * 获取植物详情工具
 */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, genera, families, careGuides } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getPlantDetail = tool({
    description: "获取植物的详细养护信息，包括土壤、温度、光照、浇水等完整指南",
    inputSchema: z.object({
        plantId: z.number().describe("植物ID"),
    }),
    execute: async ({ plantId }) => {
        const [plant] = await db
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
            .where(eq(plants.id, plantId))
            .limit(1);

        if (!plant) {
            return { found: false, message: "植物不存在" };
        }

        const [careGuide] = await db
            .select()
            .from(careGuides)
            .where(eq(careGuides.plantId, plantId))
            .limit(1);

        return {
            found: true,
            plant: {
                id: plant.id,
                name: plant.name,
                englishName: plant.englishName,
                latinName: plant.latinName,
                aliases: plant.aliases,
                description: plant.description,
                family: plant.familyName,
                genus: plant.genusName,
                link: `/plant/${plant.id}`,
            },
            careGuide: careGuide ? {
                soil: careGuide.soil,
                temperature: careGuide.temperature,
                light: careGuide.light,
                watering: careGuide.watering,
                humidity: careGuide.humidity,
                fertilizing: careGuide.fertilizing,
                pestControl: careGuide.pestControl,
                pruning: careGuide.pruning,
                postBloom: careGuide.postBloom,
                propagation: careGuide.propagation,
                notes: careGuide.notes,
            } : null,
        };
    },
});
