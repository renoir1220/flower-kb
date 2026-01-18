CREATE TABLE `llm_prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_name` text NOT NULL,
	`prompt` text NOT NULL,
	`is_default` integer NOT NULL DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_prompts_task_name_unique` ON `llm_prompts` (`task_name`);
