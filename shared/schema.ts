import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  messageText: text("message_text"),
  responseText: text("response_text"),
  status: text("status").notNull().default("processed"), // processed, failed, sent
  // Analytics fields
  intent: text("intent"), // moodboard.add, network.suggest, task.create, chat.generic, none
  entities: jsonb("entities"), // JSON of extracted entities
  deepLink: text("deep_link"), // Generated deep link
  latencyMs: integer("latency_ms"), // Processing time in milliseconds
  deepLinkClicked: boolean("deep_link_clicked").default(false), // Track if user clicked the link
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).pick({
  eventType: true,
  senderId: true,
  recipientId: true,
  messageText: true,
  responseText: true,
  status: true,
  intent: true,
  entities: true,
  deepLink: true,
  latencyMs: true,
  deepLinkClicked: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
