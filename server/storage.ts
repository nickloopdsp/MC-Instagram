import { users, type User, type InsertUser, type WebhookEvent, type InsertWebhookEvent } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getRecentWebhookEvents(limit?: number): Promise<WebhookEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private webhookEvents: Map<number, WebhookEvent>;
  currentUserId: number;
  currentEventId: number;

  constructor() {
    this.users = new Map();
    this.webhookEvents = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const id = this.currentEventId++;
    const event: WebhookEvent = { 
      eventType: insertEvent.eventType,
      senderId: insertEvent.senderId,
      recipientId: insertEvent.recipientId,
      messageText: insertEvent.messageText || null,
      responseText: insertEvent.responseText || null,
      status: insertEvent.status || "processed",
      id, 
      createdAt: new Date()
    };
    this.webhookEvents.set(id, event);
    return event;
  }

  async getRecentWebhookEvents(limit: number = 50): Promise<WebhookEvent[]> {
    const events = Array.from(this.webhookEvents.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return events;
  }
}

export const storage = new MemStorage();
