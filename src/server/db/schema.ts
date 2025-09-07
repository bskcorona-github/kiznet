import { pgTable, serial, varchar, timestamp, integer, boolean, date, index, uniqueIndex } from "drizzle-orm/pg-core";

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
  sex: varchar("sex", { length: 10 }),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  treeIdx: index("people_tree_idx").on(t.treeId),
}));

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  parentId: integer("parent_id").notNull(),
  childId: integer("child_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueRel: uniqueIndex("uq_parent_child").on(t.treeId, t.parentId, t.childId),
}));

export const partnerships = pgTable("partnerships", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  partnerAId: integer("partner_a_id").notNull(),
  partnerBId: integer("partner_b_id").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  type: varchar("type", { length: 24 }).default("marriage").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniquePair: uniqueIndex("uq_partner_pair").on(t.treeId, t.partnerAId, t.partnerBId),
}));


