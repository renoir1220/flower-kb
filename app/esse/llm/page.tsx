import { db } from "@/db";
import { llmConfigs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toNumber(value: FormDataEntryValue | null) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toText(value: FormDataEntryValue | null) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

export default async function LlmConfigsPage() {
  const configs = await db.select().from(llmConfigs).orderBy(desc(llmConfigs.id));

  async function createConfig(formData: FormData) {
    "use server";
    const name = toText(formData.get("name"));
    const provider = toText(formData.get("provider"));
    const baseUrl = toText(formData.get("baseUrl"));
    const apiKey = toText(formData.get("apiKey"));
    const model = toText(formData.get("model"));
    const endpoint = toText(formData.get("endpoint"));
    const isDefault = formData.get("isDefault") ? 1 : 0;
    const temperature = toNumber(formData.get("temperature"));
    const topP = toNumber(formData.get("topP"));
    const maxTokens = toNumber(formData.get("maxTokens"));

    if (!name || !provider || !baseUrl || !apiKey || !model) {
      return;
    }

    if (isDefault) {
      await db.update(llmConfigs).set({ isDefault: 0 });
    }

    await db.insert(llmConfigs).values({
      name,
      provider,
      baseUrl,
      apiKey,
      model,
      endpoint: endpoint || "/api/v3/chat/completions",
      temperature,
      topP,
      maxTokens,
      isDefault,
    });
  }

  async function updateConfig(formData: FormData) {
    "use server";
    const id = toNumber(formData.get("id"));
    if (!id) {
      return;
    }

    const name = toText(formData.get("name"));
    const provider = toText(formData.get("provider"));
    const baseUrl = toText(formData.get("baseUrl"));
    const apiKey = toText(formData.get("apiKey"));
    const model = toText(formData.get("model"));
    const endpoint = toText(formData.get("endpoint"));
    const isDefault = formData.get("isDefault") ? 1 : 0;
    const temperature = toNumber(formData.get("temperature"));
    const topP = toNumber(formData.get("topP"));
    const maxTokens = toNumber(formData.get("maxTokens"));

    if (isDefault) {
      await db.update(llmConfigs).set({ isDefault: 0 });
    }

    await db
      .update(llmConfigs)
      .set({
        name: name || "",
        provider: provider || "",
        baseUrl: baseUrl || "",
        apiKey: apiKey || "",
        model: model || "",
        endpoint: endpoint || "/api/v3/chat/completions",
        temperature,
        topP,
        maxTokens,
        isDefault,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(llmConfigs.id, id));
  }

  async function deleteConfig(formData: FormData) {
    "use server";
    const id = toNumber(formData.get("id"));
    if (!id) {
      return;
    }
    await db.delete(llmConfigs).where(eq(llmConfigs.id, id));
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold">LLM 配置</h1>
          <p className="text-sm text-muted-foreground">管理模型、密钥与默认配置</p>
        </div>
      </div>

      <div className="px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>新增配置</CardTitle>
            <CardDescription>用于切换不同模型或密钥</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createConfig} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input name="name" placeholder="名称" required />
                <Input name="provider" placeholder="提供方（例如 volcengine）" required />
                <Input name="baseUrl" placeholder="基础地址" required />
                <Input name="endpoint" placeholder="接口路径（/api/v3/chat/completions）" />
                <Input name="apiKey" placeholder="API Key" required />
                <Input name="model" placeholder="模型名称" required />
                <Input name="temperature" placeholder="temperature（可选）" />
                <Input name="topP" placeholder="top_p（可选）" />
                <Input name="maxTokens" placeholder="max_tokens（可选）" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isDefault" />
                设为默认配置
              </label>
              <Button type="submit" className="w-fit">新增配置</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="border-b border-border/40">
                <CardTitle>{config.name}</CardTitle>
                <CardDescription>
                  {config.provider} · {config.model}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateConfig} className="grid gap-3">
                  <input type="hidden" name="id" value={config.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="name" defaultValue={config.name} />
                    <Input name="provider" defaultValue={config.provider} />
                    <Input name="baseUrl" defaultValue={config.baseUrl} />
                    <Input name="endpoint" defaultValue={config.endpoint} />
                    <Input name="apiKey" defaultValue={config.apiKey} />
                    <Input name="model" defaultValue={config.model} />
                    <Input name="temperature" defaultValue={config.temperature ?? ""} />
                    <Input name="topP" defaultValue={config.topP ?? ""} />
                    <Input name="maxTokens" defaultValue={config.maxTokens ?? ""} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isDefault" defaultChecked={config.isDefault === 1} />
                      设为默认配置
                    </label>
                    <Button type="submit" size="sm">保存</Button>
                    <Button type="submit" size="sm" variant="ghost" formAction={deleteConfig}>
                      删除
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
