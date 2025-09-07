import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { trees } from "@/server/db/schema";
import { TreeSchema } from "@/types";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allTrees = await db.select().from(trees).orderBy(desc(trees.updatedAt));
    return NextResponse.json(allTrees);
  } catch (error) {
    console.error("Failed to fetch trees:", error);
    return NextResponse.json(
      { error: "Failed to fetch trees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = TreeSchema.parse(body);

    const [newTree] = await db
      .insert(trees)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newTree, { status: 201 });
  } catch (error) {
    console.error("Failed to create tree:", error);
    return NextResponse.json(
      { error: "Failed to create tree" },
      { status: 500 }
    );
  }
}
