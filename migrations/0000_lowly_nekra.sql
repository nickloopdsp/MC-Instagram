CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"message_text" text,
	"response_text" text,
	"status" text DEFAULT 'processed' NOT NULL,
	"intent" text,
	"entities" jsonb,
	"deep_link" text,
	"latency_ms" integer,
	"deep_link_clicked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
