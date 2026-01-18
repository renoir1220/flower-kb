import { db } from "@/db";
import { plants, genera, families, careGuides, tags, plantTags } from "@/db/schema";
import { eq, like, or, and, sql, inArray, desc } from "drizzle-orm";

export interface SearchResult {
    id: number;
    name: string;
    englishName: string | null;
    latinName: string | null;
    aliases: string | null;
    description: string | null;
    familyName: string;
    genusName: string;
    matchContext?: string; // 匹配到的上下文片段
    tags: { id: number; name: string; category: string; color: string | null }[];
}

export interface SearchFacets {
    categories: { name: string; count: number; type: 'family' | 'tag' }[];
    tags: { id: number; name: string; count: number; color: string | null }[];
}

export async function searchPlants(
    queryStr: string,
    selectedTags: string[] = [] // Array of tag names or family names
): Promise<{ results: SearchResult[]; facets: SearchFacets }> {
    // 1. 准备关键词
    const terms = queryStr.trim().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) {
        return { results: [], facets: { categories: [], tags: [] } };
    }

    // 2. 构建基础查询
    // 我们需要连接所有相关表以进行文本搜索
    const baseQuery = db
        .select({
            id: plants.id,
            name: plants.name,
            englishName: plants.englishName,
            latinName: plants.latinName,
            aliases: plants.aliases,
            description: plants.description,
            familyName: families.name,
            genusName: genera.name,
            careSoil: careGuides.soil,
            careTemp: careGuides.temperature,
            careLight: careGuides.light,
            careWater: careGuides.watering,
            careHumid: careGuides.humidity,
            careFert: careGuides.fertilizing,
            carePest: careGuides.pestControl,
            carePrun: careGuides.pruning,
            careProp: careGuides.propagation,
            careNotes: careGuides.notes,
        })
        .from(plants)
        .leftJoin(genera, eq(plants.genusId, genera.id))
        .leftJoin(families, eq(genera.familyId, families.id))
        .leftJoin(careGuides, eq(plants.id, careGuides.plantId));

    // 3. 应用关键词过滤 (AND 逻辑)
    // 每个关键词必须至少在一个字段中匹配
    const conditions = terms.map(term => {
        const pattern = `%${term}%`;
        return or(
            like(plants.name, pattern),
            like(plants.englishName, pattern),
            like(plants.aliases, pattern),
            like(plants.latinName, pattern),
            like(plants.description, pattern),
            like(families.name, pattern),
            like(genera.name, pattern),
            // search in care guides
            like(careGuides.soil, pattern),
            like(careGuides.temperature, pattern),
            like(careGuides.light, pattern),
            like(careGuides.watering, pattern),
            like(careGuides.humidity, pattern),
            like(careGuides.notes, pattern)
        );
    });

    // Execute query to get potential matches
    // 注意：并在 JS 层做二次过滤（如 Tags）和 Snippet 生成可能更灵活，
    // 也可以直接在 SQL里做 filtering，但 Drizzle 对复杂动态 join 过滤稍微繁琐
    // 鉴于数据量不大，先获取 ID 再聚合 Tags 也是一种策略。

    // 这里我们先执行上面的宽泛搜索
    const rows = await baseQuery.where(and(...conditions));

    // 4. 获取所有匹配植物的详细 Tags 信息，用于过滤和 Facet 计算
    const plantIds = rows.map(r => r.id);
    if (plantIds.length === 0) {
        return { results: [], facets: { categories: [], tags: [] } };
    }

    const plantsTagsRaw = await db
        .select({
            plantId: plantTags.plantId,
            tagId: tags.id,
            tagName: tags.name,
            tagCat: tags.category,
            tagColor: tags.color,
        })
        .from(plantTags)
        .innerJoin(tags, eq(plantTags.tagId, tags.id))
        .where(inArray(plantTags.plantId, plantIds));

    // Map plantId -> Tags[]
    const tagsMap = new Map<number, typeof plantsTagsRaw>();
    plantsTagsRaw.forEach(pt => {
        if (!tagsMap.has(pt.plantId)) tagsMap.set(pt.plantId, []);
        tagsMap.get(pt.plantId)!.push(pt);
    });

    // 5. 组装结果并应用 Selected Tags 过滤
    let filteredResults = rows.map(row => {
        const pTags = tagsMap.get(row.id) || [];
        // 构造 SearchResult
        const result: SearchResult = {
            id: row.id,
            name: row.name,
            englishName: row.englishName,
            latinName: row.latinName,
            aliases: row.aliases,
            description: row.description,
            familyName: row.familyName!,
            genusName: row.genusName!,
            tags: pTags.map(t => ({ id: t.tagId, name: t.tagName, category: t.tagCat || 'other', color: t.tagColor })),
            matchContext: generateSnippet(row, terms)
        };
        return result;
    });

    if (selectedTags.length > 0) {
        filteredResults = filteredResults.filter(r => {
            // 这里的过滤可以是 Tags OR Family
            const itemTags = new Set([...r.tags.map(t => t.name), r.familyName]);
            // AND logic: item must have ALL selected tags? Or ANY? 
            // User said: "点击这些标签可以起到对结果二次过滤的作用" usually implies Drill-down (AND).
            return selectedTags.every(tag => itemTags.has(tag));
        });
    }

    // 6. 计算 Facets (基于过滤后的结果)
    const tagCounts = new Map<string, { count: number, meta: any }>();

    filteredResults.forEach(r => {
        // Count Families
        const famKey = `family:${r.familyName}`;
        if (!tagCounts.has(famKey)) tagCounts.set(famKey, { count: 0, meta: { type: 'family', name: r.familyName } });
        tagCounts.get(famKey)!.count++;

        // Count Tags
        r.tags.forEach(t => {
            const tagKey = `tag:${t.name}`;
            if (!tagCounts.has(tagKey)) tagCounts.set(tagKey, { count: 0, meta: { type: 'tag', ...t } });
            tagCounts.get(tagKey)!.count++;
        });
    });

    const facets: SearchFacets = {
        categories: [],
        tags: []
    };

    tagCounts.forEach((val, key) => {
        if (val.meta.type === 'family') {
            facets.categories.push({ name: val.meta.name, count: val.count, type: 'family' });
        } else {
            facets.tags.push({ id: val.meta.id, name: val.meta.name, count: val.count, color: val.meta.color });
        }
    });

    // Sort facets by count desc
    facets.categories.sort((a, b) => b.count - a.count);
    facets.tags.sort((a, b) => b.count - a.count);

    return { results: filteredResults, facets };
}

function generateSnippet(row: any, terms: string[]): string {
    // 简单的关键词上下文提取
    // 优先检查 description, 然后是 care guides
    const fieldsToCheck = [
        row.description,
        row.careSoil, row.careTemp, row.careLight, row.careWater, row.careNotes
    ];

    for (const text of fieldsToCheck) {
        if (!text) continue;
        for (const term of terms) {
            const idx = text.toLowerCase().indexOf(term.toLowerCase());
            if (idx !== -1) {
                // Return a snippet around the match
                const start = Math.max(0, idx - 20);
                const end = Math.min(text.length, idx + 80);
                return (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "");
            }
        }
    }
    return row.description?.substring(0, 100) || "暂无描述";
}
