/**
 * 植物诊断工具
 */
import { tool, generateText } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { plants, careGuides, families, genera } from "@/db/schema";
import { eq } from "drizzle-orm";

// 同样需要推断 model 类型
type GenerateTextParams = Parameters<typeof generateText>[0];
type ModelType = GenerateTextParams["model"];

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

const DIAGNOSTIC_PROMPT = (symptom: string, plantInfo?: string) => `
# Role
你是一位拥有丰富经验的植物病理学家和园艺专家。

# Task
根据用户描述的症状和提供的植物信息（如果有），诊断植物可能存在的问题，并提供解决方案。

# Input Data
${plantInfo ? `--- 植物信息 ---\n${plantInfo}\n----------------` : "（用户未指定具体植物，请提供通用诊断）"}

症状描述：${symptom}

# Rules
1. 分析深入：结合植物的习性（如喜阴/喜阳、耐旱/喜湿）进行分析。
2. 建议具体：给出可操作的步骤（如“停止浇水3天”、“修剪烂根”）。
3. 语气专业且亲切。

# Output Format (Structured JSON Only)
只输出 JSON 对象，不要输出其他内容：
{
  "plantName": "植物名称（如果已知）",
  "diagnosis": "对问题的详细诊断分析（100字以内）",
  "possibleCauses": ["可能原因1", "可能原因2", "可能原因3"],
  "solutions": ["解决方案1", "解决方案2", "解决方案3"],
  "prevention": "预防再次发生的建议"
}
`;

type GetDiagnosticsToolOptions = {
    model: ModelType;
};

export function getDiagnosticsTool({ model }: GetDiagnosticsToolOptions) {
    return tool({
        description: "诊断植物健康问题（如黄叶、烂根、虫害等）。当用户描述植物状态不好并寻求帮助时使用。",
        inputSchema: z.object({
            symptom: z.string().describe("症状描述，例如：叶子发黄、长斑、不长个、叶子下垂等"),
            plantName: z.string().optional().describe("植物名称（如果用户提供了）"),
        }),
        execute: async ({ symptom, plantName }) => {
            let plantInfoText = "";
            let plantId = null;

            // 1. 如果提供了植物名称，先查询上下文
            if (plantName) {
                // 重新查，用更稳妥的方式
                const targetPlant = await db.query.plants.findFirst({
                    where: (plants, { like, or, eq }) =>
                        or(eq(plants.name, plantName), like(plants.name, `%${plantName}%`)),
                    with: {
                        careGuide: true,
                        genus: {
                            with: {
                                family: true
                            }
                        }
                    }
                });

                if (targetPlant) {
                    plantId = targetPlant.id;
                    plantInfoText = `
名称：${targetPlant.name}
分类：${targetPlant.genus.family.name}科 ${targetPlant.genus.name}属
简介：${targetPlant.description}
养护指南：
- 土壤：${targetPlant.careGuide?.soil || "未知"}
- 温度：${targetPlant.careGuide?.temperature || "未知"}
- 光照：${targetPlant.careGuide?.light || "未知"}
- 浇水：${targetPlant.careGuide?.watering || "未知"}
- 湿度：${targetPlant.careGuide?.humidity || "未知"}
                    `.trim();
                } else {
                    plantInfoText = `用户提到了植物"${plantName}"，但在知识库中未找到详细信息。`;
                }
            }

            // 2. 调用 LLM 进行诊断
            try {
                const result = await generateText({
                    model,
                    messages: [{ role: "user", content: DIAGNOSTIC_PROMPT(symptom, plantInfoText) }],
                });

                const parsed = parseStructuredResult(result.text);

                if (parsed) {
                    return {
                        success: true,
                        result: parsed,
                        plantId: plantId, // 如果关联到了植物，返回 ID 以便前端生成链接
                    };
                } else {
                    return {
                        success: false,
                        message: "无法生成诊断报告，请稍后重试。",
                        rawResult: result.text
                    };
                }

            } catch (error) {
                console.error("Diagnostic error:", error);
                return { success: false, message: "诊断过程发生错误，请稍后重试" };
            }
        },
    });
}
