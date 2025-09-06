import { db } from "../index";
import { relationships } from "../schema";
import { and, eq } from "drizzle-orm";

export async function createRelationship(values: typeof relationships.$inferInsert) {
  // 重複防止 (treeId, type, fromId, toId)
  const exists = await db.select({ id: relationships.id })
    .from(relationships)
    .where(and(
      eq(relationships.treeId, values.treeId),
      eq(relationships.type, values.type),
      eq(relationships.fromId, values.fromId),
      eq(relationships.toId, values.toId)
    ));
  if (exists.length > 0) return exists[0];

  const [row] = await db.insert(relationships).values(values).returning();
  return row;
}

export async function deleteRelationship(id: string) {
  await db.delete(relationships).where(eq(relationships.id, id));
}

export async function listRelationshipsByTree(treeId: string) {
  return db.select().from(relationships).where(eq(relationships.treeId, treeId));
}


