import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gemSuggestions = sqliteTable("gem_suggestions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  region: text("region").notNull(),
  category: text("category").notNull(),
  mapUrl: text("map_url"),
  normalizedKey: text("normalized_key").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
