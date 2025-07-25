import { pgTable, unique, serial, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const webhookEvents = pgTable("webhook_events", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	senderId: text("sender_id").notNull(),
	recipientId: text("recipient_id").notNull(),
	messageText: text("message_text"),
	responseText: text("response_text"),
	status: text().default('processed').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	intent: text(),
	entities: jsonb(),
	deepLink: text("deep_link"),
	latencyMs: integer("latency_ms"),
	deepLinkClicked: boolean("deep_link_clicked").default(false),
});
