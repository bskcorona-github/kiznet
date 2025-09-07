import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { trees } from "@/server/db/schema";
import { TreeSchema } from "@/types";
import { eq } from "drizzle-orm";

interface Props {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [tree] = await db.select().from(trees).where(eq(trees.id, id));
    
    if (!tree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    return NextResponse.json(tree);
  } catch (error) {
    console.error("Failed to fetch tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch tree" },
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
    const validatedData = TreeSchema.parse(body);

    const [updatedTree] = await db
      .update(trees)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        updatedAt: new Date(),
      })
      .where(eq(trees.id, id))
      .returning();

    if (!updatedTree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTree);
  } catch (error) {
    console.error("Failed to update tree:", error);
    return NextResponse.json(
      { error: "Failed to update tree" },
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

    const [deletedTree] = await db
      .delete(trees)
      .where(eq(trees.id, id))
      .returning();

    if (!deletedTree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tree deleted successfully" });
  } catch (error) {
    console.error("Failed to delete tree:", error);
    return NextResponse.json(
      { error: "Failed to delete tree" },
      { status: 500 }
    );
  }
}
