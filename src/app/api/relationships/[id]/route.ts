import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteRelationship } from '@db/repo/relationships';

export const runtime = 'nodejs';

const idParam = z.object({ id: z.string().uuid() });

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    await deleteRelationship(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 });
  }
}


