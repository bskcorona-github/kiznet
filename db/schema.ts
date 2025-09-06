import { pgTable, varchar, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum('gender', ['male','female','other','unknown']);
export const relEnum = pgEnum('relationship_type', ['parent_child','spouse','adoption']);

export const trees = pgTable('trees', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 120 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  familyName: varchar('family_name', { length: 120 }).notNull(),
  givenName: varchar('given_name', { length: 120 }).notNull(),
  kana: varchar('kana', { length: 240 }),
  gender: genderEnum('gender').default('unknown'),
  birthDate: varchar('birth_date', { length: 10 }),
  deathDate: varchar('death_date', { length: 10 }),
  address: text('address'),
  phone: varchar('phone', { length: 60 }),
  email: varchar('email', { length: 160 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const relationships = pgTable('relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  type: relEnum('type').notNull(),
  fromId: uuid('from_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  toId: uuid('to_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  startDate: varchar('start_date', { length: 10 }),
  endDate: varchar('end_date', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


