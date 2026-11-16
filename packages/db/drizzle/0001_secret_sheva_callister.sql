ALTER TABLE "intents" ALTER COLUMN "file_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "specs" ALTER COLUMN "file_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "intents" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "specs" ADD COLUMN "content" text;