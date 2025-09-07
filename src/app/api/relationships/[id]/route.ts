import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { relationships } from "@/server/db/schema";
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

    const [relationship] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, id));
    
    if (!relationship) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    return NextResponse.json(relationship);
  } catch (error) {
    console.error("Failed to fetch relationship:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationship" },
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

    const [deletedRelationship] = await db
      .delete(relationships)
      .where(eq(relationships.id, id))
      .returning();

    if (!deletedRelationship) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Relationship deleted successfully" });
  } catch (error) {
    console.error("Failed to delete relationship:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
}
