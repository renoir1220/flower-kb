
import "dotenv/config";
import Database from "better-sqlite3";
import path from "path";
import { db } from "../db";
import {
    users, conversations, messages,
    families, genera, plants, careGuides,
    tags, plantTags, llmConfigs, llmPrompts
} from "../db/schema";

// Helper to fix boolean mapping (0/1 -> false/true)
const ensureBool = (val: any) => !!val;

// Helper to safe parse date
const parseDate = (val: any) => {
    if (!val) return new Date();
    // Handle standard SQLite timestamp "YYYY-MM-DD HH:MM:SS"
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return new Date(val.replace(' ', 'T') + 'Z');
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        console.warn('Invalid date encountered:', val, 'Using current time.');
        return new Date();
    }
    return d;
}

async function migrate() {
    console.log("Starting data migration...");

    const sqlitePath = path.join(process.cwd(), "data", "flower-kb.db");
    const sqlite = new Database(sqlitePath);

    try {
        // 1. Users
        // SQLite: id, username, display_name, role, created_at
        // Schema: id, username, displayName, role, createdAt
        const rawUsers = sqlite.prepare("SELECT * FROM users").all() as any[];
        console.log(`Migrating ${rawUsers.length} users...`);
        if (rawUsers.length > 0) {
            const mapped = rawUsers.map(u => ({
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                role: u.role,
                createdAt: parseDate(u.created_at),
            }));
            await db.insert(users).values(mapped).onConflictDoNothing();
        }

        // 2. Conversations
        // SQLite: id, user_id, title, created_at, updated_at
        // Schema: id, userId, title, createdAt, updatedAt
        const rawConvs = sqlite.prepare("SELECT * FROM conversations").all() as any[];
        console.log(`Migrating ${rawConvs.length} conversations...`);
        if (rawConvs.length > 0) {
            const mapped = rawConvs.map(c => ({
                id: c.id,
                userId: c.user_id,
                title: c.title,
                createdAt: parseDate(c.created_at),
                updatedAt: parseDate(c.updated_at),
            }));
            await db.insert(conversations).values(mapped).onConflictDoNothing();
        }

        // 3. Messages
        // SQLite: id, conversation_id, role, content, tool_invocations, created_at
        // Schema: id, conversationId, role, content, toolInvocations, createdAt
        const rawMsgs = sqlite.prepare("SELECT * FROM messages").all() as any[];
        console.log(`Migrating ${rawMsgs.length} messages...`);
        if (rawMsgs.length > 0) {
            const mapped = rawMsgs.map(m => ({
                id: m.id,
                conversationId: m.conversation_id,
                role: m.role,
                content: m.content,
                toolInvocations: m.tool_invocations,
                createdAt: parseDate(m.created_at),
            }));
            await db.insert(messages).values(mapped).onConflictDoNothing();
        }

        // 4. Families
        // SQLite: id, name, latin_name, description, created_at
        // Schema: id, name, latinName, description, createdAt
        const rawFamilies = sqlite.prepare("SELECT * FROM families").all() as any[];
        console.log(`Migrating ${rawFamilies.length} families...`);
        if (rawFamilies.length > 0) {
            const mapped = rawFamilies.map(f => ({
                id: f.id, // Explicitly keep ID
                name: f.name,
                latinName: f.latin_name,
                description: f.description,
                createdAt: parseDate(f.created_at),
            }));
            await db.insert(families).values(mapped).onConflictDoNothing();
        }

        // 5. Genera
        // SQLite: id, family_id, name, latin_name
        // Schema: id, familyId, name, latinName
        const rawGenera = sqlite.prepare("SELECT * FROM genera").all() as any[];
        console.log(`Migrating ${rawGenera.length} genera...`);
        if (rawGenera.length > 0) {
            const mapped = rawGenera.map(g => ({
                id: g.id,
                familyId: g.family_id,
                name: g.name,
                latinName: g.latin_name,
            }));
            await db.insert(genera).values(mapped).onConflictDoNothing();
        }

        // 6. Plants
        // SQLite: id, genus_id, name, english_name, aliases, latin_name, image_url, difficulty, description, created_at, updated_at
        // Schema: ... camelCase
        const rawPlants = sqlite.prepare("SELECT * FROM plants").all() as any[];
        console.log(`Migrating ${rawPlants.length} plants...`);
        if (rawPlants.length > 0) {
            const mapped = rawPlants.map(p => ({
                id: p.id,
                genusId: p.genus_id,
                name: p.name,
                englishName: p.english_name,
                aliases: p.aliases,
                latinName: p.latin_name,
                imageUrl: p.image_url,
                difficulty: p.difficulty,
                description: p.description,
                createdAt: parseDate(p.created_at),
                updatedAt: parseDate(p.updated_at),
            }));
            await db.insert(plants).values(mapped).onConflictDoNothing();
        }

        // 7. Care Guides
        // SQLite: id, plant_id, soil, temperature, light, watering, humidity, fertilizing, pest_control, post_bloom, pruning, propagation, notes
        // Schema: ... camelCase (pestControl, postBloom)
        const rawCare = sqlite.prepare("SELECT * FROM care_guides").all() as any[];
        console.log(`Migrating ${rawCare.length} care guides...`);
        if (rawCare.length > 0) {
            const mapped = rawCare.map(c => ({
                id: c.id,
                plantId: c.plant_id,
                soil: c.soil,
                temperature: c.temperature,
                light: c.light,
                watering: c.watering,
                humidity: c.humidity,
                fertilizing: c.fertilizing,
                pestControl: c.pest_control,
                postBloom: c.post_bloom,
                pruning: c.pruning,
                propagation: c.propagation,
                notes: c.notes,
            }));
            await db.insert(careGuides).values(mapped).onConflictDoNothing();
        }

        // 8. Tags
        // SQLite: id, name, category, color
        const rawTags = sqlite.prepare("SELECT * FROM tags").all() as any[];
        console.log(`Migrating ${rawTags.length} tags...`);
        if (rawTags.length > 0) {
            // No property name changes needed here unless schema differs
            await db.insert(tags).values(rawTags).onConflictDoNothing();
        }

        // 9. Plant Tags
        // SQLite: plant_id, tag_id
        // Schema: plantId, tagId
        const rawPlantTags = sqlite.prepare("SELECT * FROM plant_tags").all() as any[];
        console.log(`Migrating ${rawPlantTags.length} plant_tags relationships...`);
        if (rawPlantTags.length > 0) {
            const mapped = rawPlantTags.map(pt => ({
                plantId: pt.plant_id,
                tagId: pt.tag_id,
            }));
            await db.insert(plantTags).values(mapped).onConflictDoNothing();
        }

        // 10. LLM Configs
        // SQLite: id, name, provider, base_url, api_key, model, endpoint, temperature, top_p, max_tokens, is_default, created_at, updated_at
        const rawLlmCfgs = sqlite.prepare("SELECT * FROM llm_configs").all() as any[];
        console.log(`Migrating ${rawLlmCfgs.length} LLM configs...`);
        if (rawLlmCfgs.length > 0) {
            const mapped = rawLlmCfgs.map((c: any) => ({
                id: c.id,
                name: c.name,
                provider: c.provider,
                baseUrl: c.base_url,
                apiKey: c.api_key,
                model: c.model,
                endpoint: c.endpoint,
                temperature: c.temperature,
                topP: c.top_p,
                maxTokens: c.max_tokens,
                isDefault: ensureBool(c.is_default),
                createdAt: parseDate(c.created_at),
                updatedAt: parseDate(c.updated_at),
            }));
            await db.insert(llmConfigs).values(mapped).onConflictDoNothing();
        }

        // 11. LLM Prompts
        // SQLite: id, task_name, prompt, request_params, is_default, created_at, updated_at
        const rawPrompts = sqlite.prepare("SELECT * FROM llm_prompts").all() as any[];
        console.log(`Migrating ${rawPrompts.length} LLM prompts...`);
        if (rawPrompts.length > 0) {
            const mapped = rawPrompts.map((p: any) => ({
                id: p.id,
                taskName: p.task_name,
                prompt: p.prompt,
                requestParams: p.request_params,
                isDefault: ensureBool(p.is_default),
                createdAt: parseDate(p.created_at),
                updatedAt: parseDate(p.updated_at),
            }));
            await db.insert(llmPrompts).values(mapped).onConflictDoNothing();
        }

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        sqlite.close();
        process.exit(0);
    }
}


migrate();
