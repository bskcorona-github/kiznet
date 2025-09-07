import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { relationships, people } from "@/server/db/schema";
import { RelationshipSchema } from "@/types";
import { eq, and, or } from "drizzle-orm";

// サイクル（循環）チェック関数
async function hasCircularReference(parentId: number, childId: number, treeId: number): Promise<boolean> {
  const visited = new Set<number>();
  const queue: number[] = [childId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (currentId === parentId) {
      return true; // サイクルが検出された
    }

    if (visited.has(currentId)) {
      continue;
    }
    
    visited.add(currentId);

    // 子ノードの親を取得
    const childRelations = await db
      .select({ parentId: relationships.parentId })
      .from(relationships)
      .where(and(
        eq(relationships.treeId, parseInt(treeId)),
        eq(relationships.childId, currentId)
      ));

    for (const rel of childRelations) {
      queue.push(rel.parentId);
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId parameter is required" },
        { status: 400 }
      );
    }

    const allRelationships = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, parseInt(treeId)));

    return NextResponse.json(allRelationships);
  } catch (error) {
    console.error("Failed to fetch relationships:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treeId, ...relationshipData } = body;

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId is required" },
        { status: 400 }
      );
    }

    const validatedData = RelationshipSchema.parse(relationshipData);
    const { parentId, childId } = validatedData;

    // 自己参照チェック
    if (parentId === childId) {
      return NextResponse.json(
        { error: "親子関係で自己参照はできません" },
        { status: 400 }
      );
    }

    // 既存の関係をチェック
    const existingRelation = await db
      .select()
      .from(relationships)
      .where(and(
        eq(relationships.treeId, parseInt(treeId)),
        eq(relationships.parentId, parentId),
        eq(relationships.childId, childId)
      ));

    if (existingRelation.length > 0) {
      return NextResponse.json(
        { error: "この親子関係は既に存在します" },
        { status: 409 }
      );
    }

    // サイクルチェック
    const hasCircle = await hasCircularReference(parentId, childId, parseInt(treeId));
    if (hasCircle) {
      return NextResponse.json(
        { error: "この関係を追加すると循環参照が発生します" },
        { status: 400 }
      );
    }

    // 人物の存在確認
    const [parentExists] = await db
      .select()
      .from(people)
      .where(and(
        eq(people.id, parentId),
        eq(people.treeId, parseInt(treeId))
      ));

    const [childExists] = await db
      .select()
      .from(people)
      .where(and(
        eq(people.id, childId),
        eq(people.treeId, parseInt(treeId))
      ));

    if (!parentExists || !childExists) {
      return NextResponse.json(
        { error: "指定された人物が見つかりません" },
        { status: 404 }
      );
    }

    const [newRelationship] = await db
      .insert(relationships)
      .values({
        treeId: parseInt(treeId),
        parentId,
        childId,
      })
      .returning();

    return NextResponse.json(newRelationship, { status: 201 });
  } catch (error) {
    console.error("Failed to create relationship:", error);
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    );
  }
}
