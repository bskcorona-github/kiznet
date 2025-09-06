import { db } from "../index";
import { trees } from "../schema";
import { eq, desc } from "drizzle-orm";

export async function listTrees() {
  return db.select({ id: trees.id, title: trees.title, createdAt: trees.createdAt })
    .from(trees)
    .orderBy(desc(trees.createdAt));
}

export async function createTree(title: string) {
  const [row] = await db.insert(trees).values({ title }).returning({ id: trees.id, title: trees.title, createdAt: trees.createdAt });
  return row;
}

export async function deleteTree(id: string) {
  await db.delete(trees).where(eq(trees.id, id));
}


