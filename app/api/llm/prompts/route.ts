import { NextResponse } from "next/server";
import { db } from "@/db";
import { llmPrompts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskName = searchParams.get("task");

    if (taskName) {
      const [prompt] = await db
        .select()
        .from(llmPrompts)
        .where(eq(llmPrompts.taskName, taskName))
        .limit(1);

      if (!prompt) {
        return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
      }

      return NextResponse.json(prompt);
    }

    const [defaultPrompt] = await db
      .select()
      .from(llmPrompts)
      .where(eq(llmPrompts.isDefault, true))
      .limit(1);

    if (defaultPrompt) {
      return NextResponse.json(defaultPrompt);
    }

    const [latestPrompt] = await db
      .select()
      .from(llmPrompts)
      .orderBy(desc(llmPrompts.id))
      .limit(1);

    if (!latestPrompt) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    return NextResponse.json(latestPrompt);
  } catch (error) {
    console.error("Failed to fetch prompt:", error);
    return NextResponse.json({ error: "Failed to fetch prompt." }, { status: 500 });
  }
}
