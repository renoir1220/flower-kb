import { db } from "@/db";
import { plants, genera, families, careGuides, tags, plantTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PlantDetailView } from "@/components/plant-detail-view";

async function getPlant(id: number) {
    const [plant] = await db
        .select({
            id: plants.id,
            name: plants.name,
            englishName: plants.englishName,
            aliases: plants.aliases,
            latinName: plants.latinName,
            difficulty: plants.difficulty,
            description: plants.description,
            genusName: genera.name,
            familyName: families.name,
            familyLatinName: families.latinName, // Keep this just in case, though not used in UI view now
        })
        .from(plants)
        .innerJoin(genera, eq(plants.genusId, genera.id))
        .innerJoin(families, eq(genera.familyId, families.id))
        .where(eq(plants.id, id))
        .limit(1);

    if (!plant) return null;

    const [careGuide] = await db
        .select()
        .from(careGuides)
        .where(eq(careGuides.plantId, id))
        .limit(1);

    const plantTagsData = await db
        .select({
            name: tags.name,
            color: tags.color,
        })
        .from(plantTags)
        .innerJoin(tags, eq(plantTags.tagId, tags.id))
        .where(eq(plantTags.plantId, id));

    return {
        ...plant,
        careGuide,
        tags: plantTagsData,
    };
}

export default async function PlantDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;
    const plantId = parseInt(resolvedParams.id);

    if (isNaN(plantId)) {
        notFound();
    }

    const plant = await getPlant(plantId);

    if (!plant) {
        notFound();
    }

    return <PlantDetailView plant={plant} />;
}
