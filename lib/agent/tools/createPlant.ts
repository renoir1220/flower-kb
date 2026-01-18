/**
 * 创建植物工具
 */
import { tool, generateText } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, genera, families, careGuides, tags, plantTags } from "@/db/schema";
import { eq } from "drizzle-orm";
// 从 generateText 推断 model 类型
type GenerateTextParams = Parameters<typeof generateText>[0];
type ModelType = GenerateTextParams["model"];

// 解析 LLM 返回的 JSON
function parseStructuredResult(rawContent: unknown) {
    if (typeof rawContent !== "string") {
        return null;
    }

    const trimmed = rawContent.trim();
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            return null;
        }
        try {
            return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}

// 完整词条生成 Prompt
const FULL_ENTRY_PROMPT = (name: string) => `# Role
你是一位拥有丰富经验的园艺专家和植物学家。

# Task
请根据用户输入的【植物中文名】，生成该植物的完整知识词条信息。

# Rules
1. 内容准确：基于植物的真实习性和学术资料。
2. 科名和属名必须准确，使用中文名称。
3. 英文名和拉丁学名必须准确。
4. 别名要全面，包含常见的俗称。
5. 简介要简洁优雅，50-100字。
6. 养护指南要专业具体。

# Output Format (Structured JSON Only)
只输出 JSON 对象，不要输出其他内容：
{
  "familyName": "科名（中文，如：天门冬科）",
  "familyLatinName": "科的拉丁名（如：Asparagaceae）",
  "genusName": "属名（中文，如：风信子属）",
  "genusLatinName": "属的拉丁名（如：Hyacinthus）",
  "englishName": "英文名",
  "latinName": "拉丁学名",
  "aliases": "别名1、别名2、别名3",
  "description": "植物简介",
  "difficulty": "easy/medium/hard",
  "careGuide": {
    "soil": "土壤要求",
    "temperature": "温度要求",
    "light": "光照要求",
    "watering": "浇水要求",
    "humidity": "湿度要求",
    "fertilizing": "施肥要求",
    "pestControl": "病虫害防治",
    "pruning": "修剪要求",
    "postBloom": "花后管理",
    "propagation": "繁殖方法",
    "notes": "特别注意事项"
  },
  "tags": [
    { "name": "标签名", "category": "type/scene/feature" }
  ]
}

# User Input
请为我生成【${name}】的完整知识词条。`;

type CreatePlantToolOptions = {
    model: ModelType;
};

export function createPlantTool({ model }: CreatePlantToolOptions) {
    return tool({
        description: "创建新的植物词条，只需提供中文名，AI 会自动生成完整信息。如果植物所属的科/属不存在，会返回提示需要先创建分类。",
        inputSchema: z.object({
            name: z.string().describe("植物中文名"),
        }),
        execute: async ({ name }) => {
            // 检查是否已存在
            const existing = await db
                .select()
                .from(plants)
                .where(eq(plants.name, name))
                .get();

            if (existing) {
                return {
                    success: false,
                    message: `植物"${name}"已存在`,
                    existingPlant: {
                        id: existing.id,
                        name: existing.name,
                        link: `/plant/${existing.id}`,
                    },
                };
            }

            let plantData = null;
            let careGuideData = null;

            try {
                // 调用 LLM 生成完整词条
                const result = await generateText({
                    model,
                    messages: [{ role: "user", content: FULL_ENTRY_PROMPT(name) }],
                });

                const parsed = parseStructuredResult(result.text);
                if (parsed) {
                    plantData = parsed;
                    careGuideData = parsed.careGuide;
                }
            } catch (error) {
                console.error("Failed to generate plant entry:", error);
                return { success: false, message: "生成词条信息失败，请稍后重试" };
            }

            if (!plantData) {
                return { success: false, message: "生成词条信息失败，请稍后重试" };
            }

            // 检查科是否存在
            const familyName = plantData.familyName;
            const genusName = plantData.genusName;

            const targetFamily = await db
                .select()
                .from(families)
                .where(eq(families.name, familyName))
                .get();

            // 如果科不存在，返回提示
            if (!targetFamily) {
                return {
                    success: false,
                    needsTaxonomy: true,
                    message: `植物"${name}"属于"${familyName} - ${genusName}"，但该分类在知识库中不存在。是否需要先创建这个分类？`,
                    suggestedTaxonomy: {
                        familyName: plantData.familyName,
                        familyLatinName: plantData.familyLatinName,
                        genusName: plantData.genusName,
                        genusLatinName: plantData.genusLatinName,
                    },
                    plantName: name,
                };
            }

            // 检查属是否存在
            const targetGenus = await db
                .select()
                .from(genera)
                .where(eq(genera.name, genusName))
                .get();

            // 如果属不存在，返回提示
            if (!targetGenus) {
                return {
                    success: false,
                    needsTaxonomy: true,
                    message: `科"${familyName}"已存在，但属"${genusName}"不存在。是否需要先创建这个属？`,
                    suggestedTaxonomy: {
                        familyName: plantData.familyName,
                        familyLatinName: plantData.familyLatinName,
                        genusName: plantData.genusName,
                        genusLatinName: plantData.genusLatinName,
                        familyExists: true,
                    },
                    plantName: name,
                };
            }

            // 创建植物
            const newPlant = await db
                .insert(plants)
                .values({
                    name,
                    englishName: plantData.englishName || null,
                    latinName: plantData.latinName || null,
                    aliases: plantData.aliases || null,
                    description: plantData.description || null,
                    difficulty: plantData.difficulty || "medium",
                    genusId: targetGenus.id,
                })
                .returning()
                .get();

            // 保存养护指南
            if (careGuideData) {
                try {
                    await db.insert(careGuides).values({
                        plantId: newPlant.id,
                        soil: careGuideData.soil || null,
                        temperature: careGuideData.temperature || null,
                        light: careGuideData.light || null,
                        watering: careGuideData.watering || null,
                        humidity: careGuideData.humidity || null,
                        fertilizing: careGuideData.fertilizing || null,
                        pestControl: careGuideData.pestControl || null,
                        pruning: careGuideData.pruning || null,
                        postBloom: careGuideData.postBloom || null,
                        propagation: careGuideData.propagation || null,
                        notes: careGuideData.notes || null,
                    });
                } catch (error) {
                    console.error("Failed to save care guide:", error);
                }
            }

            // 保存标签
            if (plantData.tags && Array.isArray(plantData.tags)) {
                for (const tagData of plantData.tags) {
                    try {
                        // 查找或创建标签
                        let tag = await db
                            .select()
                            .from(tags)
                            .where(eq(tags.name, tagData.name))
                            .get();

                        if (!tag) {
                            tag = await db
                                .insert(tags)
                                .values({
                                    name: tagData.name,
                                    category: tagData.category || "type",
                                })
                                .returning()
                                .get();
                        }

                        // 创建关联
                        await db.insert(plantTags).values({
                            plantId: newPlant.id,
                            tagId: tag.id,
                        });
                    } catch (error) {
                        console.error("Failed to save tag:", tagData.name, error);
                    }
                }
            }

            return {
                success: true,
                message: `成功创建植物词条"${name}"，已归类到"${familyName} - ${genusName}"`,
                plant: {
                    id: newPlant.id,
                    name: newPlant.name,
                    englishName: newPlant.englishName,
                    latinName: newPlant.latinName,
                    family: familyName,
                    genus: genusName,
                    link: `/plant/${newPlant.id}`,
                },
                generatedInfo: {
                    hasEnglishName: !!newPlant.englishName,
                    hasLatinName: !!newPlant.latinName,
                    hasAliases: !!newPlant.aliases,
                    hasDescription: !!newPlant.description,
                    hasCareGuide: !!careGuideData,
                },
            };
        },
    });
}
