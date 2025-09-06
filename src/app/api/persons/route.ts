import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPerson } from '@db/repo/persons';

export const runtime = 'nodejs';

// 空文字は undefined/null に丸めるヘルパ
const toUndefined = (v: unknown) => (v === '' ? undefined : v);
const toNull = (v: unknown) => (v === '' ? null : v);

const schema = z.object({
  treeId: z.string().uuid(),
  familyName: z.string().min(1),
  givenName: z.string().min(1),
  kana: z.preprocess(toNull, z.string().optional().nullable()),
  gender: z.preprocess(toNull, z.enum(['male','female','other','unknown']).optional().nullable()),
  birthDate: z.preprocess(toUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  deathDate: z.preprocess(toUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  address: z.preprocess(toNull, z.string().optional().nullable()),
  phone: z.preprocess(toNull, z.string().optional().nullable()),
  email: z.preprocess(toNull, z.string().email().optional().nullable()),
  notes: z.preprocess(toNull, z.string().optional().nullable()),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const values = schema.parse(body);
    const row = await createPerson(values);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: 'Failed to create person' }, { status });
  }
}


