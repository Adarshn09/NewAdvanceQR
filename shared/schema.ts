import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),              // optional but required for password reset
  password: text("password"),                 // nullable for OAuth users
  googleId: text("google_id").unique(),
  githubId: text("github_id").unique(),
  resetToken: text("reset_token"),            // password-reset token (nullable)
  resetTokenExpiry: timestamp("reset_token_expiry"), // expiry timestamp (nullable)
});

export const qrCodes = pgTable("qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // url, text, email, phone, sms, wifi, vcard
  content: text("content").notNull(),
  shortCode: varchar("short_code").notNull().unique(),
  clickCount: integer("click_count").default(0),
  
  // Customization options
  foregroundColor: text("foreground_color").default("#000000"),
  backgroundColor: text("background_color").default("#ffffff"),
  size: integer("size").default(400),
  logoUrl: text("logo_url"),
  logoData: text("logo_data"), // Base64 encoded logo data
  style: text("style").default("square"), // square, rounded, dots
  errorCorrection: text("error_correction").default("M"), // L, M, Q, H
  margin: integer("margin").default(2),
  enableTracking: text("enable_tracking").default("true"), // true, false - whether to use tracking URLs
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number",
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: "Password must contain at least one special character",
  });

export const insertUserSchema = createInsertSchema(users)
  .pick({ username: true, password: true, email: true })
  .extend({
    password: strongPassword,
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
  });

export const oauthUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  googleId: true,
  githubId: true,
});
export type OAuthUser = z.infer<typeof oauthUserSchema>;

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  shortCode: true,
  clickCount: true,
  createdAt: true,
  updatedAt: true,
});

export const updateQrCodeSchema = z.object({
  id: z.string(),
  content: z.string().min(1, "Content is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type QrCode = typeof qrCodes.$inferSelect;
export type UpdateQrCode = z.infer<typeof updateQrCodeSchema>;
