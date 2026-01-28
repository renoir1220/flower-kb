/**
 * 创建植物工具
 * 
 * 一次性完成：查重 → 自动创建分类 → 创建植物
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

/**
 * 确保分类存在，不存在则自动创建
 */
async function ensureTaxonomyExists(plantData: {
    familyName: string;
    familyLatinName?: string;
    genusName: string;
    genusLatinName?: string;
}) {
    const { familyName, familyLatinName, genusName, genusLatinName } = plantData;

    // 检查或创建科
    let [targetFamily] = await db
        .select()
        .from(families)
        .where(eq(families.name, familyName))
        .limit(1);

    let familyCreated = false;
    if (!targetFamily) {
        [targetFamily] = await db
            .insert(families)
            .values({
                name: familyName,
                latinName: familyLatinName || null,
            })
            .returning();
        familyCreated = true;
    }

    // 检查或创建属
    let [targetGenus] = await db
        .select()
        .from(genera)
        .where(eq(genera.name, genusName))
        .limit(1);

    let genusCreated = false;
    if (!targetGenus) {
        [targetGenus] = await db
            .insert(genera)
            .values({
                name: genusName,
                latinName: genusLatinName || null,
                familyId: targetFamily.id,
            })
            .returning();
        genusCreated = true;
    }

    return {
        family: targetFamily,
        genus: targetGenus,
        familyCreated,
        genusCreated,
    };
}

export function createPlantTool({ model }: CreatePlantToolOptions) {
    return tool({
        description: "创建新的植物词条。只需提供植物中文名，会自动生成完整信息，自动创建所需的科/属分类。如果植物已存在，返回已有词条的链接。",
        inputSchema: z.object({
            name: z.string().describe("植物中文名"),
        }),
        execute: async ({ name }) => {
            // 1. 查重：检查名称或别名是否已存在
            const existingByName = await db
                .select()
                .from(plants)
                .where(eq(plants.name, name))
                .limit(1);

            if (existingByName.length > 0) {
                const existing = existingByName[0];
                return {
                    success: false,
                    alreadyExists: true,
                    message: `植物「${name}」已存在`,
                    existingPlant: {
                        id: existing.id,
                        name: existing.name,
                        link: `/plant/${existing.id}`,
                    },
                };
            }

            // 检查别名中是否包含该名称
            const allPlants = await db.select().from(plants);
            for (const plant of allPlants) {
                if (plant.aliases) {
                    const aliasList = plant.aliases.split(/[,、，]/).map(a => a.trim());
                    if (aliasList.includes(name)) {
                        return {
                            success: false,
                            alreadyExists: true,
                            message: `「${name}」是「${plant.name}」的别名，该植物已存在`,
                            existingPlant: {
                                id: plant.id,
                                name: plant.name,
                                link: `/plant/${plant.id}`,
                            },
                        };
                    }
                }
            }

            // 2. 调用 LLM 生成完整词条信息
            let plantData = null;
            let careGuideData = null;

            try {
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

            // 3. 自动创建分类（若不存在）
            const taxonomy = await ensureTaxonomyExists({
                familyName: plantData.familyName,
                familyLatinName: plantData.familyLatinName,
                genusName: plantData.genusName,
                genusLatinName: plantData.genusLatinName,
            });

            // 4. 创建植物
            const [newPlant] = await db
                .insert(plants)
                .values({
                    name,
                    englishName: plantData.englishName || null,
                    latinName: plantData.latinName || null,
                    aliases: plantData.aliases || null,
                    description: plantData.description || null,
                    difficulty: plantData.difficulty || "medium",
                    genusId: taxonomy.genus.id,
                })
                .returning();

            // 5. 保存养护指南
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

            // 6. 保存标签
            if (plantData.tags && Array.isArray(plantData.tags)) {
                for (const tagData of plantData.tags) {
                    try {
                        // 查找或创建标签
                        let [tag] = await db
                            .select()
                            .from(tags)
                            .where(eq(tags.name, tagData.name))
                            .limit(1);

                        if (!tag) {
                            [tag] = await db
                                .insert(tags)
                                .values({
                                    name: tagData.name,
                                    category: tagData.category || "type",
                                })
                                .returning();
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

            // 构建创建结果消息
            const taxonomyNote = [];
            if (taxonomy.familyCreated) {
                taxonomyNote.push(`科「${taxonomy.family.name}」`);
            }
            if (taxonomy.genusCreated) {
                taxonomyNote.push(`属「${taxonomy.genus.name}」`);
            }

            return {
                success: true,
                message: `成功创建植物词条「${name}」，已归类到「${taxonomy.family.name} - ${taxonomy.genus.name}」`,
                taxonomyCreated: taxonomyNote.length > 0 ? taxonomyNote.join("、") : null,
                plant: {
                    id: newPlant.id,
                    name: newPlant.name,
                    englishName: newPlant.englishName,
                    latinName: newPlant.latinName,
                    family: taxonomy.family.name,
                    genus: taxonomy.genus.name,
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
