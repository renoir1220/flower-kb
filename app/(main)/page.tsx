import { db } from "@/db";
import { plants, genera, families, tags, plantTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PlantListItem } from "@/components/plant-list-item";
import { Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search-bar";
import { SearchFilters } from "@/components/search-filters";
import { EmptySearchResult } from "@/components/empty-search-result";
import { searchPlants } from "@/lib/search";

async function getPlants() {
  const allPlants = await db
    .select({
      id: plants.id,
      name: plants.name,
      latinName: plants.latinName,
      imageUrl: plants.imageUrl,
      difficulty: plants.difficulty,
      genusId: plants.genusId,
      genusName: genera.name,
      familyId: genera.familyId,
      familyName: families.name,
      familyLatinName: families.latinName,
    })
    .from(plants)
    .innerJoin(genera, eq(plants.genusId, genera.id))
    .innerJoin(families, eq(genera.familyId, families.id));

  // 获取每个植物的标签
  const plantsWithTags = await Promise.all(
    allPlants.map(async (plant) => {
      const plantTagsData = await db
        .select({
          name: tags.name,
          color: tags.color,
        })
        .from(plantTags)
        .innerJoin(tags, eq(plantTags.tagId, tags.id))
        .where(eq(plantTags.plantId, plant.id));

      return {
        ...plant,
        tags: plantTagsData.map((t) => ({
          name: t.name,
          color: t.color || "#22c55e",
        })),
      };
    })
  );

  return plantsWithTags;
}

async function getTags() {
  return await db.select().from(tags);
}

async function getFamilies() {
  return await db.select().from(families);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const filterStr = typeof resolvedSearchParams.filters === "string" ? resolvedSearchParams.filters : "";
  const selectedFilters = filterStr ? filterStr.split(",") : [];

  // 获取默认目录数据
  const [allPlants, allTags, allFamilies] = await Promise.all([
    getPlants(),
    getTags(),
    getFamilies(),
  ]);

  // 如果有搜索，执行搜索逻辑
  const searchResult = query
    ? await searchPlants(query, selectedFilters)
    : { results: [], facets: { categories: [], tags: [] } };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section - Conditional */}
      {!query && (
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-[100%] blur-[100px] -z-10" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

          <div className="container mx-auto px-6 relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-medium tracking-wide mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              收录 {allPlants.length} 种植物
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-foreground max-w-4xl mx-auto leading-[1.1]">
              探索植物世界的
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600">
                生命之美
              </span>
            </h1>

            <div className="mb-12">
              <SearchBar />
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <section className={`py-12 border-t border-border/40 min-h-[500px] ${query ? "pt-8" : ""}`}>
        <div className="container mx-auto px-6">

          {query ? (
            /* Search Results View */
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">搜索结果</h2>
                <span className="text-muted-foreground text-sm">找到 {searchResult.results.length} 个相关结果</span>
              </div>

              {/* Filters */}
              <SearchFilters facets={searchResult.facets} />

              {/* Results List */}
              <div className="space-y-8 mt-8">
                {searchResult.results.length > 0 ? (
                  searchResult.results.map((result) => (
                    <div key={result.id} className="group">
                      <Link href={`/plant/${result.id}`} className="block">
                        <h3 className="text-xl font-semibold text-primary hover:underline mb-1">
                          {result.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-green-700/80 mb-2">
                          <span>{result.familyName} &gt; {result.genusName}</span>
                          {result.englishName && <span>· {result.englishName}</span>}
                          {result.latinName && <span>· {result.latinName}</span>}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                          {result.matchContext}
                        </p>
                      </Link>
                    </div>
                  ))
                ) : (
                  <EmptySearchResult query={query} />
                )}
              </div>
            </div>
          ) : (
            /* Default Catalog View */
            <>
              <div className="flex items-center justify-between mb-16">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2">植物名录</h2>
                  <p className="text-muted-foreground text-lg">系统化分类索引</p>
                </div>
              </div>

              <div className="space-y-16">
                {allFamilies.map((family) => {
                  const familyPlants = allPlants.filter(
                    (p) => p.familyId === family.id
                  );
                  if (familyPlants.length === 0) return null;

                  return (
                    <div key={family.id} className="relative">
                      <div className="flex items-baseline gap-4 mb-6 pb-2 border-b border-border/40">
                        <h3 className="text-xl font-bold text-foreground">
                          {family.name}
                        </h3>
                        <span className="font-serif italic text-muted-foreground">
                          {family.latinName}
                        </span>
                        <span className="ml-auto text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          {familyPlants.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-2">
                        {familyPlants.map((plant) => (
                          <PlantListItem
                            key={plant.id}
                            id={plant.id}
                            name={plant.name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <Leaf className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">FlowerKB</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              这里是植物爱好者的栖息地。我们致力于提供最准确、最实用的植物养护知识。
            </p>
            <div className="text-sm text-muted-foreground/60 mt-8">
              © 2024 FlowerKB. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
