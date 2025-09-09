import { pgTable, serial, varchar, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";

export const trees = pgTable("trees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }),
  sex: varchar("sex", { length: 10 }), // male|female|other|unknown
  birthOrder: varchar("birth_order", { length: 20 }), // 長男、次男、三男、長女、次女、三女等
  birthDate: date("birth_date"),
  deathDate: date("death_date"),
  isDeceased: boolean("is_deceased").default(false).notNull(),
  email: varchar("email", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  address: varchar("address", { length: 240 }),
  city: varchar("city", { length: 120 }),
  prefecture: varchar("prefecture", { length: 120 }),
  country: varchar("country", { length: 120 }),
  lat: varchar("lat", { length: 32 }),
  lng: varchar("lng", { length: 32 }),
  note: varchar("note", { length: 1000 }),
  // 家系図での表示位置（手動配置の保存用）
  positionX: integer("position_x"), // React Flowでのx座標
  positionY: integer("position_y"), // React Flowでのy座標
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 親子関係（有向：parent -> child）
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  parentId: integer("parent_id").notNull(),
  childId: integer("child_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 配偶者/パートナー関係（無向扱い。小さい id を A 側に揃える）
export const partnerships = pgTable("partnerships", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  partnerAId: integer("partner_a_id").notNull(),
  partnerBId: integer("partner_b_id").notNull(),
  isFlipped: boolean("is_flipped").default(false).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  type: varchar("type", { length: 24 }).default("marriage").notNull(), // marriage|partner
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
