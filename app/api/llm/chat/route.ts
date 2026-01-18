import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, temperature, topP, maxTokens, configId, extraParams } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array." },
        { status: 400 }
      );
    }

    const data = await createChatCompletion({
      messages,
      model,
      temperature,
      topP,
      maxTokens,
      configId,
      extraParams: extraParams && typeof extraParams === "object" ? extraParams : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("LLM request failed:", error);
    return NextResponse.json(
      { error: "LLM request failed." },
      { status: 500 }
    );
  }
}
