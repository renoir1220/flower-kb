import Link from "next/link";
import { headers } from "next/headers";
import { Separator } from "@/components/ui/separator";

export default async function EsseLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const currentPath = headersList.get("next-url") || "";
  const isLlm = currentPath.startsWith("/esse/llm");
  const isPrompts = currentPath.startsWith("/esse/prompts");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r border-border/40 bg-background/80 backdrop-blur">
          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">FlowerKB</p>
            <h2 className="mt-2 text-2xl font-bold">管理后台</h2>
            <p className="mt-2 text-sm text-muted-foreground">模型与提示词配置</p>
          </div>
          <Separator />
          <nav className="flex-1 px-4 py-6 space-y-2 text-sm">
            <Link
              href="/esse/llm"
              className={[
                "block rounded-lg px-3 py-2 transition-colors",
                isLlm
                  ? "bg-secondary/50 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30",
              ].join(" ")}
            >
              LLM 配置
            </Link>
            <Link
              href="/esse/prompts"
              className={[
                "block rounded-lg px-3 py-2 transition-colors",
                isPrompts
                  ? "bg-secondary/50 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30",
              ].join(" ")}
            >
              提示词配置
            </Link>
          </nav>
          <div className="px-6 pb-6 text-xs text-muted-foreground">
            通过 <span className="font-semibold text-foreground">/esse</span> 访问
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
