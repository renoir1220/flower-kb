import { db } from "@/db";
import { plants, careGuides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await request.json();
        const {
            name,
            englishName,
            latinName,
            aliases,
            description,
            genusId,
            careGuide
        } = body;

        // 1. Update basic plant info
        await db.update(plants)
            .set({
                name,
                englishName,
                latinName,
                aliases,
                description,
                ...(genusId && { genusId }),
            })
            .where(eq(plants.id, id));

        // 2. Update care guide
        // Check if care guide exists first
        const [existingGuide] = await db.select().from(careGuides).where(eq(careGuides.plantId, id)).limit(1);

        if (existingGuide) {
            await db.update(careGuides)
                .set({
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
                })
                .where(eq(careGuides.plantId, id));
        } else {
            await db.insert(careGuides).values({
                plantId: id,
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
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update plant:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
