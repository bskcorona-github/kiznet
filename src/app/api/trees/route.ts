import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listTrees, createTree } from '@db/repo/trees';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listTrees();
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to list trees' }, { status: 500 });
  }
}

const createSchema = z.object({ title: z.string().min(1).max(120) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title } = createSchema.parse(body);
    const row = await createTree(title);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: 'Failed to create tree' }, { status });
  }
}


