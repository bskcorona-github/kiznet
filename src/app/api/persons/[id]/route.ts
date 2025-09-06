import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPerson, updatePerson, deletePerson } from '@db/repo/persons';

export const runtime = 'nodejs';

const idParam = z.object({ id: z.string().uuid() });
const toUndefined = (v: unknown) => (v === '' ? undefined : v);
const toNull = (v: unknown) => (v === '' ? null : v);

const updateSchema = z.object({
  familyName: z.string().min(1).optional(),
  givenName: z.string().min(1).optional(),
  kana: z.preprocess(toNull, z.string().optional().nullable()),
  gender: z.preprocess(toNull, z.enum(['male','female','other','unknown']).optional().nullable()),
  birthDate: z.preprocess(toUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  deathDate: z.preprocess(toUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  address: z.preprocess(toNull, z.string().optional().nullable()),
  phone: z.preprocess(toNull, z.string().optional().nullable()),
  email: z.preprocess(toNull, z.string().email().optional().nullable()),
  notes: z.preprocess(toNull, z.string().optional().nullable()),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    const row = await getPerson(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    const body = await req.json();
    const values = updateSchema.parse(body);
    const row = await updatePerson(id, values);
    return NextResponse.json(row);
  } catch (e: unknown) {
    console.error(e);
    const status = (typeof e === 'object' && e !== null && 'name' in e && (e as { name: string }).name === 'ZodError') ? 400 : 500;
    return NextResponse.json({ error: 'Failed to update person' }, { status });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = idParam.parse(await ctx.params);
    await deletePerson(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}


