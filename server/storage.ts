import { type User, type InsertUser, type QrCode, type InsertQrCode, type OAuthUser, users, qrCodes } from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq, sql, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertOAuthUser(profile: OAuthUser): Promise<User>;
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  clearResetToken(userId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getUserQrCodes(userId: string): Promise<QrCode[]>;
  getQrCode(id: string): Promise<QrCode | undefined>;
  getQrCodeByShortCode(shortCode: string): Promise<QrCode | undefined>;
  updateQrCodeClickCount(id: string): Promise<void>;
  updateQrCodeContent(id: string, userId: string, content: string): Promise<QrCode | undefined>;
  deleteQrCode(id: string, userId: string): Promise<boolean>;
  sessionStore?: any;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private qrCodes: Map<string, QrCode>;
  private shortCodeToQrId: Map<string, string>;

  constructor() {
    this.users = new Map();
    this.qrCodes = new Map();
    this.shortCodeToQrId = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.googleId === googleId);
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.githubId === githubId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      email: insertUser.email || null,
      googleId: null,
      githubId: null,
      resetToken: null,
      resetTokenExpiry: null,
    };
    this.users.set(id, user);
    return user;
  }

  async upsertOAuthUser(profile: OAuthUser): Promise<User> {
    // Try to find existing user by provider ID
    let existing: User | undefined;
    if (profile.googleId) existing = await this.getUserByGoogleId(profile.googleId);
    if (!existing && profile.githubId) existing = await this.getUserByGithubId(profile.githubId);
    if (existing) return existing;
    // Create new OAuth user (no password)
    const id = randomUUID();
    const user: User = {
      id,
      username: profile.username,
      email: profile.email ?? null,
      password: null,
      googleId: profile.googleId ?? null,
      githubId: profile.githubId ?? null,
      resetToken: null,
      resetTokenExpiry: null,
    };
    this.users.set(id, user);
    return user;
  }

  async createQrCode(insertQrCode: InsertQrCode): Promise<QrCode> {
    const id = randomUUID();
    const shortCode = this.generateShortCode();
    const now = new Date();
    const qrCode: QrCode = {
      ...insertQrCode,
      id,
      shortCode,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
      // Ensure all fields have proper null values instead of undefined
      foregroundColor: insertQrCode.foregroundColor || null,
      backgroundColor: insertQrCode.backgroundColor || null,
      size: insertQrCode.size || null,
      logoUrl: insertQrCode.logoUrl || null,
      logoData: insertQrCode.logoData || null,
      style: insertQrCode.style || null,
      errorCorrection: insertQrCode.errorCorrection || null,
      margin: insertQrCode.margin || null,
      enableTracking: insertQrCode.enableTracking || null,
    };
    this.qrCodes.set(id, qrCode);
    this.shortCodeToQrId.set(shortCode, id);
    return qrCode;
  }

  async getUserQrCodes(userId: string): Promise<QrCode[]> {
    return Array.from(this.qrCodes.values()).filter(
      (qrCode) => qrCode.userId === userId,
    );
  }

  async getQrCode(id: string): Promise<QrCode | undefined> {
    return this.qrCodes.get(id);
  }

  async getQrCodeByShortCode(shortCode: string): Promise<QrCode | undefined> {
    const qrCodeId = this.shortCodeToQrId.get(shortCode);
    return qrCodeId ? this.qrCodes.get(qrCodeId) : undefined;
  }

  async updateQrCodeClickCount(id: string): Promise<void> {
    const qrCode = this.qrCodes.get(id);
    if (qrCode) {
      qrCode.clickCount = (qrCode.clickCount || 0) + 1;
      qrCode.updatedAt = new Date();
      this.qrCodes.set(id, qrCode);
    }
  }

  async updateQrCodeContent(id: string, userId: string, content: string): Promise<QrCode | undefined> {
    const qrCode = this.qrCodes.get(id);
    if (qrCode && qrCode.userId === userId) {
      qrCode.content = content;
      qrCode.updatedAt = new Date();
      this.qrCodes.set(id, qrCode);
      return qrCode;
    }
    return undefined;
  }

  async deleteQrCode(id: string, userId: string): Promise<boolean> {
    const qrCode = this.qrCodes.get(id);
    if (qrCode && qrCode.userId === userId) {
      // Remove from both maps
      this.qrCodes.delete(id);
      this.shortCodeToQrId.delete(qrCode.shortCode);
      return true;
    }
    return false;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.resetToken === token);
  }

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.resetToken = token;
      user.resetTokenExpiry = expiry;
      this.users.set(userId, user);
    }
  }

  async clearResetToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.resetToken = null;
      user.resetTokenExpiry = null;
      this.users.set(userId, user);
    }
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password = hashedPassword;
      this.users.set(userId, user);
    }
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.shortCodeToQrId.has(result)) {
      return this.generateShortCode();
    }
    return result;
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {}

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.githubId, githubId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertOAuthUser(profile: OAuthUser): Promise<User> {
    let existing: User | undefined;
    if (profile.googleId) existing = await this.getUserByGoogleId(profile.googleId);
    if (!existing && profile.githubId) existing = await this.getUserByGithubId(profile.githubId);
    if (existing) return existing;
    const [user] = await db
      .insert(users)
      .values({ username: profile.username, password: null, googleId: profile.googleId ?? null, githubId: profile.githubId ?? null })
      .returning();
    return user;
  }

  async createQrCode(insertQrCode: InsertQrCode): Promise<QrCode> {
    const shortCode = await this.generateShortCode();
    const now = new Date();
    const [qrCode] = await db
      .insert(qrCodes)
      .values({
        ...insertQrCode,
        shortCode,
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return qrCode;
  }

  async getUserQrCodes(userId: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes).where(eq(qrCodes.userId, userId));
  }

  async getQrCode(id: string): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.id, id));
    return qrCode || undefined;
  }

  async getQrCodeByShortCode(shortCode: string): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.shortCode, shortCode));
    return qrCode || undefined;
  }

  async updateQrCodeClickCount(id: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ 
        clickCount: sql`${qrCodes.clickCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(qrCodes.id, id));
  }

  async updateQrCodeContent(id: string, userId: string, content: string): Promise<QrCode | undefined> {
    const [updated] = await db
      .update(qrCodes)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteQrCode(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(qrCodes)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, userId));
  }

  async clearResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  private async generateShortCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness by checking database
    const existing = await this.getQrCodeByShortCode(result);
    if (existing) {
      return this.generateShortCode();
    }
    return result;
  }
}

// Use DatabaseStorage when DATABASE_URL is configured, otherwise fall back to in-memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();
