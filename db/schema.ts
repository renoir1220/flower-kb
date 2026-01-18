import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// 植物科表
export const families = sqliteTable("families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  latinName: text("latin_name"),
  description: text("description"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// 植物属表
export const genera = sqliteTable("genera", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id")
    .notNull()
    .references(() => families.id),
  name: text("name").notNull(),
  latinName: text("latin_name"),
});

// 植物主表
export const plants = sqliteTable("plants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  genusId: integer("genus_id")
    .notNull()
    .references(() => genera.id),
  name: text("name").notNull(),
  englishName: text("english_name"),
  aliases: text("aliases"), // 别名，逗号分隔
  latinName: text("latin_name"),
  imageUrl: text("image_url"),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default(
    "medium"
  ),
  description: text("description"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// 养护指南表
export const careGuides = sqliteTable("care_guides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id)
    .unique(),
  soil: text("soil"), // 土壤
  temperature: text("temperature"), // 温度
  light: text("light"), // 光照
  watering: text("watering"), // 浇水
  humidity: text("humidity"), // 湿度
  fertilizing: text("fertilizing"), // 施肥
  pestControl: text("pest_control"), // 病虫害
  postBloom: text("post_bloom"), // 花后管理
  pruning: text("pruning"), // 修剪
  propagation: text("propagation"), // 繁殖方式
  notes: text("notes"), // 特别注意事项
});

// 标签表
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category", {
    enum: ["type", "scene", "feature"],
  }).default("type"), // type: 类型, scene: 场景, feature: 特性
  color: text("color").default("#22c55e"),
});

// 植物-标签关联表
export const plantTags = sqliteTable("plant_tags", {
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
});

// LLM 配置表
export const llmConfigs = sqliteTable("llm_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  model: text("model").notNull(),
  endpoint: text("endpoint").notNull().default("/api/v3/chat/completions"),
  temperature: real("temperature"),
  topP: real("top_p"),
  maxTokens: integer("max_tokens"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// LLM Prompt 表
export const llmPrompts = sqliteTable("llm_prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskName: text("task_name").notNull(),
  prompt: text("prompt").notNull(),
  requestParams: text("request_params"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// 关系定义
export const familiesRelations = relations(families, ({ many }) => ({
  genera: many(genera),
}));

export const generaRelations = relations(genera, ({ one, many }) => ({
  family: one(families, {
    fields: [genera.familyId],
    references: [families.id],
  }),
  plants: many(plants),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  genus: one(genera, {
    fields: [plants.genusId],
    references: [genera.id],
  }),
  careGuide: one(careGuides),
  plantTags: many(plantTags),
}));

export const careGuidesRelations = relations(careGuides, ({ one }) => ({
  plant: one(plants, {
    fields: [careGuides.plantId],
    references: [plants.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  plantTags: many(plantTags),
}));

export const plantTagsRelations = relations(plantTags, ({ one }) => ({
  plant: one(plants, {
    fields: [plantTags.plantId],
    references: [plants.id],
  }),
  tag: one(tags, {
    fields: [plantTags.tagId],
    references: [tags.id],
  }),
}));



// 用户表
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  role: text("role", { enum: ["admin", "user"] }).default("user"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// 会话表
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// 消息表
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), // UUID
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role", { enum: ["system", "user", "assistant", "data"] }).notNull(),
  content: text("content"),
  toolInvocations: text("tool_invocations", { mode: "json" }), // JSON string
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});


export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// 类型导出
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type Genus = typeof genera.$inferSelect;
export type NewGenus = typeof genera.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
export type CareGuide = typeof careGuides.$inferSelect;
export type NewCareGuide = typeof careGuides.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LlmConfig = typeof llmConfigs.$inferSelect;
export type NewLlmConfig = typeof llmConfigs.$inferInsert;
export type LlmPrompt = typeof llmPrompts.$inferSelect;
export type NewLlmPrompt = typeof llmPrompts.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
