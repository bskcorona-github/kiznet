import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { partnerships } from "@/server/db/schema";
import { PartnershipSchema } from "@/types";
import { eq, sql } from "drizzle-orm";

interface Props {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Ensure column exists
    await db.execute(sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS is_flipped boolean NOT NULL DEFAULT false`);

    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.id, id));
    
    if (!partnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    return NextResponse.json(partnership);
  } catch (error) {
    console.error("Failed to fetch partnership:", error);
    return NextResponse.json(
      { error: "Failed to fetch partnership" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = PartnershipSchema.partial().parse(body);

    // Ensure column exists
    await db.execute(sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS is_flipped boolean NOT NULL DEFAULT false`);

    const [updatedPartnership] = await db
      .update(partnerships)
      .set({
        ...(validatedData.startDate !== undefined && { startDate: validatedData.startDate || null }),
        ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate || null }),
        ...(validatedData.type !== undefined && { type: validatedData.type }),
        ...(validatedData.isFlipped !== undefined && { isFlipped: validatedData.isFlipped }),
      })
      .where(eq(partnerships.id, id))
      .returning();

    if (!updatedPartnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPartnership);
  } catch (error) {
    console.error("Failed to update partnership:", error);
    return NextResponse.json(
      { error: "Failed to update partnership" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [deletedPartnership] = await db
      .delete(partnerships)
      .where(eq(partnerships.id, id))
      .returning();

    if (!deletedPartnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Partnership deleted successfully" });
  } catch (error) {
    console.error("Failed to delete partnership:", error);
    return NextResponse.json(
      { error: "Failed to delete partnership" },
      { status: 500 }
    );
  }
}
