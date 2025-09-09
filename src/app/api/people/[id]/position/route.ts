import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { people } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

type Props = {
  params: { id: string };
};

// 位置情報更新用のスキーマ
const PositionSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
});

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { positionX, positionY } = PositionSchema.parse(body);

    const [updatedPerson] = await db
      .update(people)
      .set({
        positionX: Math.round(positionX), // 整数に丸める
        positionY: Math.round(positionY), // 整数に丸める
        updatedAt: new Date(),
      })
      .where(eq(people.id, id))
      .returning();

    if (!updatedPerson) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      position: { 
        x: updatedPerson.positionX, 
        y: updatedPerson.positionY 
      } 
    });
  } catch (error) {
    console.error("Failed to update position:", error);
    return NextResponse.json(
      { error: "Failed to update position", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
