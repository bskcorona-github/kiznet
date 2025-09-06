import { db } from "../index";
import { persons } from "../schema";
import { eq } from "drizzle-orm";

export async function createPerson(values: typeof persons.$inferInsert) {
  const [row] = await db.insert(persons).values(values).returning();
  return row;
}

export async function getPerson(id: string) {
  const [row] = await db.select().from(persons).where(eq(persons.id, id));
  return row ?? null;
}

export async function updatePerson(id: string, values: Partial<typeof persons.$inferInsert>) {
  const [row] = await db.update(persons).set(values).where(eq(persons.id, id)).returning();
  return row;
}

export async function deletePerson(id: string) {
  await db.delete(persons).where(eq(persons.id, id));
}

export async function listPersonsByTree(treeId: string) {
  return db.select().from(persons).where(eq(persons.treeId, treeId));
}


