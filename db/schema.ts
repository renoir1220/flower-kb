import { pgTable, text, serial, integer, doublePrecision, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 植物科表
export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  latinName: varchar("latin_name", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 植物属表
export const genera = pgTable("genera", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id")
    .notNull()
    .references(() => families.id),
  name: varchar("name", { length: 255 }).notNull(),
  latinName: varchar("latin_name", { length: 255 }),
});

// 植物主表
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  genusId: integer("genus_id")
    .notNull()
    .references(() => genera.id),
  name: varchar("name", { length: 255 }).notNull(),
  englishName: varchar("english_name", { length: 255 }),
  aliases: text("aliases"), // 别名，逗号分隔
  latinName: varchar("latin_name", { length: 255 }),
  imageUrl: text("image_url"),
  difficulty: varchar("difficulty", { length: 50 }).default("medium"), // simplified enum to varchar for now or use pgEnum
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 养护指南表
export const careGuides = pgTable("care_guides", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id)
    .unique(),
  soil: text("soil"),
  temperature: text("temperature"),
  light: text("light"),
  watering: text("watering"),
  humidity: text("humidity"),
  fertilizing: text("fertilizing"),
  pestControl: text("pest_control"),
  postBloom: text("post_bloom"),
  pruning: text("pruning"),
  propagation: text("propagation"),
  notes: text("notes"),
});

// 标签表
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 50 }).default("type"),
  color: varchar("color", { length: 50 }).default("#22c55e"),
});

// 植物-标签关联表
export const plantTags = pgTable("plant_tags", {
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
});

// LLM 配置表
export const llmConfigs = pgTable("llm_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 500 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull().default("/api/v3/chat/completions"),
  temperature: doublePrecision("temperature"),
  topP: doublePrecision("top_p"),
  maxTokens: integer("max_tokens"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LLM Prompt 表
export const llmPrompts = pgTable("llm_prompts", {
  id: serial("id").primaryKey(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  requestParams: text("request_params"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 会话表
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 消息表
export const messages = pgTable("messages", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 })
    .notNull()
    .references(() => conversations.id),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content"),
  toolInvocations: text("tool_invocations"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Agent 执行日志 - 会话表
export const agentSessions = pgTable("agent_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 }),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  totalDurationMs: integer("total_duration_ms"),
  totalSteps: integer("total_steps").default(0),
  totalPromptTokens: integer("total_prompt_tokens").default(0),
  totalCompletionTokens: integer("total_completion_tokens").default(0),
  status: varchar("status", { length: 50 }).default("running"), // running, completed, error
  errorMessage: text("error_message"),
});

// Agent 执行日志 - 步骤表
export const agentSteps = pgTable("agent_steps", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 })
    .notNull()
    .references(() => agentSessions.id),
  stepNumber: integer("step_number").notNull(),
  stepType: varchar("step_type", { length: 50 }).notNull(), // llm_response, tool_call, tool_result
  toolName: varchar("tool_name", { length: 255 }),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  input: text("input"), // JSON: 输入消息或工具参数
  output: text("output"), // JSON: LLM 响应或工具结果
  reasoning: text("reasoning"), // 推理过程
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  error: text("error"),
});

// Agent 日志关系
export const agentSessionsRelations = relations(agentSessions, ({ many }) => ({
  steps: many(agentSteps),
}));

export const agentStepsRelations = relations(agentSteps, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentSteps.sessionId],
    references: [agentSessions.id],
  }),
}));

// Agent 日志类型导出
export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
export type AgentStep = typeof agentSteps.$inferSelect;
export type NewAgentStep = typeof agentSteps.$inferInsert;
