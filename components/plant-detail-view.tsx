"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Pencil, Save, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { SearchBar } from "@/components/search-bar";

interface PlantDetailViewProps {
    plant: {
        id: number;
        name: string;
        englishName: string | null;
        latinName: string | null;
        aliases: string | null;
        description: string | null;
        genusId: number;
        familyId: number;
        familyName: string;
        genusName: string;
        careGuide: {
            soil: string | null;
            temperature: string | null;
            light: string | null;
            watering: string | null;
            humidity: string | null;
            fertilizing: string | null;
            pestControl: string | null;
            pruning: string | null;
            postBloom: string | null;
            propagation: string | null;
            notes: string | null;
        } | undefined;
        tags: {
            name: string;
            color: string | null;
        }[];
    };
    families: { id: number; name: string; latinName: string | null }[];
    genera: { id: number; name: string; latinName: string | null; familyId: number }[];
}

interface CareItemProps {
    title: string;
    content: string | null | undefined;
}

function CareItem({ title, content }: CareItemProps) {
    if (!content) return null;

    return (
        <div className="group relative p-5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-colors duration-300">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                    {title}
                </h4>
                <CopyButton content={content} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                {content}
            </p>
        </div>
    );
}

export function PlantDetailView({ plant, families, genera }: PlantDetailViewProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: plant.name,
        englishName: plant.englishName || "",
        latinName: plant.latinName || "",
        aliases: plant.aliases || "",
        description: plant.description || "",
        genusId: plant.genusId,
        careGuide: {
            soil: plant.careGuide?.soil || "",
            temperature: plant.careGuide?.temperature || "",
            light: plant.careGuide?.light || "",
            watering: plant.careGuide?.watering || "",
            humidity: plant.careGuide?.humidity || "",
            fertilizing: plant.careGuide?.fertilizing || "",
            pestControl: plant.careGuide?.pestControl || "",
            pruning: plant.careGuide?.pruning || "",
            postBloom: plant.careGuide?.postBloom || "",
            propagation: plant.careGuide?.propagation || "",
            notes: plant.careGuide?.notes || "",
        }
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/plants/${plant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to update");

            setIsEditing(false);
            router.refresh(); // Refresh server component to get new data
        } catch (error) {
            console.error(error);
            alert("保存失败，请重试");
        } finally {
            setIsSaving(false);
        }
    };

    const parseStructuredResult = (rawContent: unknown) => {
        if (typeof rawContent !== "string") {
            return null;
        }

        const trimmed = rawContent.trim();
        try {
            return JSON.parse(trimmed);
        } catch {
            const start = trimmed.indexOf("{");
            const end = trimmed.lastIndexOf("}");
            if (start === -1 || end === -1 || end <= start) {
                return null;
            }
            try {
                return JSON.parse(trimmed.slice(start, end + 1));
            } catch {
                return null;
            }
        }
    };

    const parseRequestParams = (rawParams: unknown) => {
        if (rawParams == null) {
            return null;
        }

        if (typeof rawParams === "object") {
            return rawParams as Record<string, unknown>;
        }

        if (typeof rawParams === "string") {
            try {
                return JSON.parse(rawParams) as Record<string, unknown>;
            } catch {
                return null;
            }
        }

        return null;
    };

    const handleGenerateCareGuide = async () => {
        if (!formData.name.trim()) {
            alert("请先填写植物名称");
            return;
        }

        setIsGenerating(true);
        setGenerateError(null);
        try {
            const promptRes = await fetch("/api/llm/prompts?task=care_guide_generate");
            if (!promptRes.ok) {
                throw new Error("获取提示词失败，请稍后重试。");
            }
            const promptData = await promptRes.json();
            const promptTemplate = String(promptData.prompt || "");
            const prompt = promptTemplate.replace(/\{\{plantName\}\}/g, formData.name.trim());
            const extraParams = parseRequestParams(promptData.requestParams);

            const aiRes = await fetch("/api/llm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "system", content: prompt }],
                    extraParams,
                }),
            });

            const aiData = await aiRes.json();
            if (!aiRes.ok) {
                throw new Error(aiData?.error || "AI 调用失败，请稍后重试。");
            }

            const content = aiData?.choices?.[0]?.message?.content;
            const parsed = parseStructuredResult(content);
            const careGuide = parsed?.careGuide || parsed?.care || null;

            if (!careGuide) {
                throw new Error("AI 输出无法解析，请检查提示词或稍后重试。");
            }

            setFormData((prev) => ({
                ...prev,
                careGuide: {
                    ...prev.careGuide,
                    soil: careGuide.soil?.text || careGuide.soil || prev.careGuide.soil,
                    temperature: careGuide.temperature?.text || careGuide.temperature || prev.careGuide.temperature,
                    light: careGuide.light?.text || careGuide.light || prev.careGuide.light,
                    watering: careGuide.watering?.text || careGuide.watering || prev.careGuide.watering,
                    humidity: careGuide.humidity?.text || careGuide.humidity || prev.careGuide.humidity,
                    fertilizing: careGuide.fertilizing?.text || careGuide.fertilizing || prev.careGuide.fertilizing,
                    pestControl: careGuide.pestControl?.text || careGuide.pestControl || prev.careGuide.pestControl,
                    postBloom: careGuide.postBloom?.text || careGuide.postBloom || prev.careGuide.postBloom,
                    pruning: careGuide.pruning?.text || careGuide.pruning || prev.careGuide.pruning,
                    propagation: careGuide.propagation?.text || careGuide.propagation || prev.careGuide.propagation,
                    notes: careGuide.notes?.text || careGuide.notes || prev.careGuide.notes,
                },
            }));
        } catch (error) {
            console.error(error);
            setGenerateError(error instanceof Error ? error.message : "AI 生成失败，请稍后重试。");
        } finally {
            setIsGenerating(false);
        }
    };

    const careItems = [
        { key: "soil", title: "土壤基质", content: formData.careGuide.soil },
        { key: "temperature", title: "温度要求", content: formData.careGuide.temperature },
        { key: "light", title: "光照条件", content: formData.careGuide.light },
        { key: "watering", title: "浇水频率", content: formData.careGuide.watering },
        { key: "humidity", title: "环境湿度", content: formData.careGuide.humidity },
        { key: "fertilizing", title: "施肥建议", content: formData.careGuide.fertilizing },
        { key: "pestControl", title: "病虫害防治", content: formData.careGuide.pestControl },
        { key: "pruning", title: "修剪维护", content: formData.careGuide.pruning },
        { key: "postBloom", title: "花期管理", content: formData.careGuide.postBloom },
        { key: "propagation", title: "繁殖方式", content: formData.careGuide.propagation },
        { key: "notes", title: "特别注意", content: formData.careGuide.notes },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navigation & Toolbar */}
            <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex-shrink-0">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">返回目录</span>
                            </Button>
                        </Link>
                    </div>

                    <div className="flex-1 max-w-sm mx-auto">
                        <SearchBar variant="compact" />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!isEditing ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    编辑
                                </Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                {generateError && (
                                    <span className="text-xs text-red-500 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                                        {generateError}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateCareGuide}
                                    disabled={isSaving || isGenerating}
                                >
                                    {isGenerating ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    AI 生成
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                    <X className="h-4 w-4 mr-2" />
                                    取消
                                </Button>
                                <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    保存
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <div className="container max-w-4xl mx-auto px-6 pt-24 pb-20">

                {/* Header Section */}
                <header className="mb-20 text-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="inline-flex items-center gap-3 text-sm font-medium text-primary tracking-wide uppercase px-4 py-1.5 rounded-full bg-primary/5">
                            <span>{plant.familyName}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            <span>{plant.genusName}</span>
                        </div>

                        <div className="space-y-4 max-w-2xl mx-auto w-full">
                            {isEditing ? (() => {
                                // 根据当前选中的属获取对应的科
                                const currentGenus = genera.find(g => g.id === formData.genusId);
                                const currentFamilyId = currentGenus?.familyId || plant.familyId;
                                // 过滤出当前科下的所有属
                                const filteredGenera = genera.filter(g => g.familyId === currentFamilyId);

                                return (
                                    <div className="space-y-4 p-6 bg-secondary/20 rounded-xl border border-border/50">
                                        {/* 科属选择 */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase">科</label>
                                                <select
                                                    value={currentFamilyId}
                                                    onChange={e => {
                                                        const newFamilyId = parseInt(e.target.value);
                                                        // 切换科时，自动选择该科下的第一个属
                                                        const firstGenus = genera.find(g => g.familyId === newFamilyId);
                                                        if (firstGenus) {
                                                            setFormData({ ...formData, genusId: firstGenus.id });
                                                        }
                                                    }}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                                >
                                                    {families.map(f => (
                                                        <option key={f.id} value={f.id}>{f.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase">属</label>
                                                <select
                                                    value={formData.genusId}
                                                    onChange={e => setFormData({ ...formData, genusId: parseInt(e.target.value) })}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                                >
                                                    {filteredGenera.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">植物名称</label>
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="text-center text-2xl font-bold h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">英文名 (English Name)</label>
                                            <Input
                                                value={formData.englishName}
                                                onChange={e => setFormData({ ...formData, englishName: e.target.value })}
                                                className="text-center text-lg font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">学名 (Latin Name)</label>
                                            <Input
                                                value={formData.latinName}
                                                onChange={e => setFormData({ ...formData, latinName: e.target.value })}
                                                className="text-center italic font-serif"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">别名 (逗号分隔)</label>
                                            <Input
                                                value={formData.aliases}
                                                onChange={e => setFormData({ ...formData, aliases: e.target.value })}
                                                className="text-center"
                                            />
                                        </div>
                                    </div>
                                );
                            })() : (
                                <>
                                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground text-balanced">
                                        {plant.name}
                                    </h1>
                                    {plant.englishName && (
                                        <p className="text-xl md:text-2xl text-muted-foreground font-medium mt-2">
                                            {plant.englishName}
                                        </p>
                                    )}
                                    {plant.latinName && (
                                        <p className="text-xl md:text-2xl text-muted-foreground/60 font-serif italic text-balanced mt-1">
                                            {plant.latinName}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {!isEditing && plant.aliases && (
                            <div className="flex flex-wrap justify-center items-center gap-3 text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground/80">别名</span>
                                {plant.aliases.split(/[,，]/).map(alias => (
                                    <span key={alias} className="px-3 py-1 rounded-full bg-secondary/50 border border-secondary">
                                        {alias.trim()}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        {isEditing ? (
                            <div className="w-full max-w-2xl space-y-2 mt-4">
                                <label className="text-xs font-medium text-muted-foreground uppercase">简介描述</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="min-h-[120px]"
                                />
                            </div>
                        ) : (
                            plant.description && (
                                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mt-4 text-pretty">
                                    {plant.description}
                                </p>
                            )
                        )}

                        {/* Tags (ReadOnly) */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {plant.tags.map((tag) => (
                                <span key={tag.name} className="flex items-center text-sm font-medium text-foreground/80 px-3 py-1 rounded-full hover:bg-secondary/50 transition-colors cursor-default">
                                    <span className="text-primary mr-1.5">#</span>
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Content Grid: Care Guide */}
                <section>
                    <div className="flex items-end justify-between mb-8 border-b border-border/40 pb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="w-8 h-[2px] bg-primary"></span>
                            养护指南
                        </h2>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Care Guide</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {careItems.map((item, index) => (
                            isEditing ? (
                                <div key={item.key} className="p-4 rounded-xl border border-border/60 bg-background space-y-2">
                                    <label className="text-xs font-bold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                                        {item.title}
                                    </label>
                                    <Textarea
                                        value={item.content || ""}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            careGuide: {
                                                ...formData.careGuide,
                                                [item.key]: e.target.value
                                            }
                                        })}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <CareItem
                                    key={item.key}
                                    title={item.title}
                                    content={item.content}
                                />
                            )
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
