CREATE TABLE `llm_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`model` text NOT NULL,
	`endpoint` text NOT NULL DEFAULT '/api/v3/chat/completions',
	`temperature` real,
	`top_p` real,
	`max_tokens` integer,
	`is_default` integer NOT NULL DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_configs_name_unique` ON `llm_configs` (`name`);
