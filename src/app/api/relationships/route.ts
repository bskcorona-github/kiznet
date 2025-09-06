import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRelationship } from '@db/repo/relationships';

export const runtime = 'nodejs';

const schema = z.object({
  treeId: z.string().uuid(),
  type: z.enum(['parent_child','spouse','adoption']),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const values = schema.parse(body);
    if (values.fromId === values.toId) {
      return NextResponse.json({ error: 'self relationship is not allowed' }, { status: 400 });
    }
    const row = await createRelationship(values);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: 'Failed to create relationship' }, { status });
  }
}


