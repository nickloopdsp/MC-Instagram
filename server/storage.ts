import { users, webhookEvents, type User, type InsertUser, type WebhookEvent, type InsertWebhookEvent } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getRecentWebhookEvents(limit?: number): Promise<WebhookEvent[]>;
  updateWebhookEventDeepLinkClicked(eventId: number): Promise<void>;
  getRecentUserMessages(senderId: string, limit?: number): Promise<WebhookEvent[]>;
  getConversationContext(senderId: string, limit?: number): Promise<Array<{messageText: string | null, responseText: string | null, intent: string | null}>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const [event] = await db
      .insert(webhookEvents)
      .values({
        eventType: insertEvent.eventType,
        senderId: insertEvent.senderId,
        recipientId: insertEvent.recipientId,
        messageText: insertEvent.messageText || null,
        responseText: insertEvent.responseText || null,
        status: insertEvent.status || "processed",
        intent: insertEvent.intent || null,
        entities: insertEvent.entities || null,
        deepLink: insertEvent.deepLink || null,
        latencyMs: insertEvent.latencyMs || null,
        deepLinkClicked: insertEvent.deepLinkClicked || false,
      })
      .returning();
    return event;
  }

  async getRecentWebhookEvents(limit: number = 50): Promise<WebhookEvent[]> {
    const events = await db
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);
    return events;
  }

  async updateWebhookEventDeepLinkClicked(eventId: number): Promise<void> {
    await db
      .update(webhookEvents)
      .set({ deepLinkClicked: true })
      .where(eq(webhookEvents.id, eventId));
  }

  async getRecentUserMessages(senderId: string, limit: number = 10): Promise<WebhookEvent[]> {
    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.senderId, senderId))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);
    return events;
  }

  async getConversationContext(senderId: string, limit: number = 10): Promise<Array<{messageText: string | null, responseText: string | null, intent: string | null}>> {
    // Get all messages in the conversation (both from user and to user)
    const events = await db
      .select({
        messageText: webhookEvents.messageText,
        responseText: webhookEvents.responseText,
        intent: webhookEvents.intent,
        eventType: webhookEvents.eventType,
        senderId: webhookEvents.senderId,
        recipientId: webhookEvents.recipientId,
        createdAt: webhookEvents.createdAt
      })
      .from(webhookEvents)
      .where(or(
        eq(webhookEvents.senderId, senderId),
        eq(webhookEvents.recipientId, senderId)
      ))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit * 2); // Get more messages since we're filtering
    
    // Transform into conversation format
    const conversation: Array<{messageText: string | null, responseText: string | null, intent: string | null}> = [];
    
    for (const event of events) {
      if (event.eventType === 'message_received' && event.senderId === senderId) {
        // User message
        conversation.push({
          messageText: event.messageText,
          responseText: null,
          intent: null
        });
      } else if (event.eventType === 'message_sent' && event.recipientId === senderId) {
        // Bot response
        conversation.push({
          messageText: null,
          responseText: event.responseText || event.messageText,
          intent: event.intent
        });
      }
    }
    
    // Return in chronological order for context, limited to requested amount
    return conversation.reverse().slice(-limit);
  }
}

export const storage = new DatabaseStorage();
