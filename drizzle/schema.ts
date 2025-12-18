import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  title: text("title"),
  subtitle: text("subtitle"),
  duration: integer("duration"),
  color: text("color"),
  date: text("date"),
  userId: text("user_id").references(() => users.id),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text()
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});