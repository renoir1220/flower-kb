import { db } from "@/db";
import { llmConfigs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
};

export type LlmChatOptions = {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  configId?: number;
  extraParams?: Record<string, unknown>;
};

export function buildTextMessage(role: LlmMessage["role"], text: string): LlmMessage {
  return { role, content: text };
}

export function buildImageTextMessage(imageUrl: string, text: string): LlmMessage {
  return {
    role: "user",
    content: [
      { type: "image_url", image_url: { url: imageUrl } },
      { type: "text", text },
    ],
  };
}

async function getActiveLlmConfig(configId?: number) {
  if (configId) {
    const [byId] = await db
      .select()
      .from(llmConfigs)
      .where(eq(llmConfigs.id, configId))
      .limit(1);
    if (byId) {
      return byId;
    }
  }

  const [defaultConfig] = await db
    .select()
    .from(llmConfigs)
    .where(eq(llmConfigs.isDefault, true))
    .limit(1);

  if (defaultConfig) {
    return defaultConfig;
  }

  const [latest] = await db.select().from(llmConfigs).orderBy(desc(llmConfigs.id)).limit(1);
  return latest;
}

export async function createChatCompletion(options: LlmChatOptions) {
  const config = await getActiveLlmConfig(options.configId);
  if (!config) {
    throw new Error("No LLM config found.");
  }

  const payload: Record<string, unknown> = {
    model: options.model ?? config.model,
    messages: options.messages,
  };

  const temperature = options.temperature ?? config.temperature;
  const topP = options.topP ?? config.topP;
  const maxTokens = options.maxTokens ?? config.maxTokens;

  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }
  if (typeof topP === "number") {
    payload.top_p = topP;
  }
  if (typeof maxTokens === "number") {
    payload.max_tokens = maxTokens;
  }

  if (options.extraParams && typeof options.extraParams === "object") {
    Object.assign(payload, options.extraParams);
  }

  const endpoint = new URL(config.endpoint, config.baseUrl).toString();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || data?.message || "LLM request failed.";
    throw new Error(message);
  }

  return data;
}
