import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { persons, relationships, trees } from '@db/schema';

export const runtime = 'nodejs';

const idParam = z.object({ id: z.string().uuid() });

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    const [tree] = await db.select().from(trees).where(eq(trees.id, id));
    if (!tree) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ps = await db.select().from(persons).where(eq(persons.treeId, id));
    const rs = await db.select().from(relationships).where(eq(relationships.treeId, id));
    return NextResponse.json({ tree, persons: ps, relationships: rs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    await db.delete(trees).where(eq(trees.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete tree' }, { status: 500 });
  }
}


