import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * one row per research run, maps to RunId and
 * to LangGraph's thread_id
 */
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});