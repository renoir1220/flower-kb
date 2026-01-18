import { db } from "@/db";
import { llmPrompts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toText(value: FormDataEntryValue | null) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function toNumber(value: FormDataEntryValue | null) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export default async function PromptsPage() {
  const prompts = await db.select().from(llmPrompts).orderBy(desc(llmPrompts.id));

  async function createPrompt(formData: FormData) {
    "use server";
    const taskName = toText(formData.get("taskName"));
    const prompt = toText(formData.get("prompt"));
    const requestParams = toText(formData.get("requestParams"));
    const isDefault = formData.get("isDefault") ? 1 : 0;

    if (!taskName || !prompt) {
      return;
    }

    if (isDefault) {
      await db.update(llmPrompts).set({ isDefault: 0 });
    }

    await db.insert(llmPrompts).values({
      taskName,
      prompt,
      requestParams,
      isDefault,
    });
  }

  async function updatePrompt(formData: FormData) {
    "use server";
    const id = toNumber(formData.get("id"));
    if (!id) {
      return;
    }

    const taskName = toText(formData.get("taskName"));
    const prompt = toText(formData.get("prompt"));
    const requestParams = toText(formData.get("requestParams"));
    const isDefault = formData.get("isDefault") ? 1 : 0;

    if (isDefault) {
      await db.update(llmPrompts).set({ isDefault: 0 });
    }

    await db
      .update(llmPrompts)
      .set({
        taskName: taskName || "",
        prompt: prompt || "",
        requestParams,
        isDefault,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(llmPrompts.id, id));
  }

  async function deletePrompt(formData: FormData) {
    "use server";
    const id = toNumber(formData.get("id"));
    if (!id) {
      return;
    }
    await db.delete(llmPrompts).where(eq(llmPrompts.id, id));
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold">提示词配置</h1>
          <p className="text-sm text-muted-foreground">维护任务 Prompt 与请求参数</p>
        </div>
      </div>

      <div className="px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>新增提示词</CardTitle>
            <CardDescription>支持 request_params JSON 与默认任务</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPrompt} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input name="taskName" placeholder="任务名称" required />
                <Input name="requestParams" placeholder="请求参数 JSON（可选）" />
              </div>
              <Textarea name="prompt" placeholder="Prompt 内容" className="min-h-[160px]" required />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isDefault" />
                设为默认任务
              </label>
              <Button type="submit" className="w-fit">新增提示词</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader className="border-b border-border/40">
                <CardTitle>{prompt.taskName}</CardTitle>
                <CardDescription>
                  {prompt.requestParams ? "带请求参数" : "无请求参数"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updatePrompt} className="grid gap-3">
                  <input type="hidden" name="id" value={prompt.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="taskName" defaultValue={prompt.taskName} />
                    <Input
                      name="requestParams"
                      defaultValue={prompt.requestParams ?? ""}
                      placeholder="请求参数 JSON（可选）"
                    />
                  </div>
                  <Textarea
                    name="prompt"
                    defaultValue={prompt.prompt}
                    className="min-h-[160px]"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isDefault" defaultChecked={prompt.isDefault === 1} />
                      设为默认任务
                    </label>
                    <Button type="submit" size="sm">保存</Button>
                    <Button type="submit" size="sm" variant="ghost" formAction={deletePrompt}>
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
