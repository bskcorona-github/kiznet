import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { partnerships, people } from "@/server/db/schema";
import { PartnershipSchema } from "@/types";
import { eq, and, or } from "drizzle-orm";

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

    const allPartnerships = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.treeId, parseInt(treeId)));

    return NextResponse.json(allPartnerships);
  } catch (error) {
    console.error("Failed to fetch partnerships:", error);
    return NextResponse.json(
      { error: "Failed to fetch partnerships" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treeId, ...partnershipData } = body;

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId is required" },
        { status: 400 }
      );
    }

    const validatedData = PartnershipSchema.parse(partnershipData);
    let { partnerAId, partnerBId } = validatedData;

    // 自己参照チェック
    if (partnerAId === partnerBId) {
      return NextResponse.json(
        { error: "配偶者関係で自己参照はできません" },
        { status: 400 }
      );
    }

    // IDを正規化（小さい方をA、大きい方をBに）
    if (partnerAId > partnerBId) {
      [partnerAId, partnerBId] = [partnerBId, partnerAId];
    }

    // 既存の関係をチェック
    const existingPartnership = await db
      .select()
      .from(partnerships)
      .where(and(
        eq(partnerships.treeId, parseInt(treeId)),
        eq(partnerships.partnerAId, partnerAId),
        eq(partnerships.partnerBId, partnerBId)
      ));

    if (existingPartnership.length > 0) {
      return NextResponse.json(
        { error: "この配偶者関係は既に存在します" },
        { status: 409 }
      );
    }

    // 人物の存在確認
    const [partnerAExists] = await db
      .select()
      .from(people)
      .where(and(
        eq(people.id, partnerAId),
        eq(people.treeId, parseInt(treeId))
      ));

    const [partnerBExists] = await db
      .select()
      .from(people)
      .where(and(
        eq(people.id, partnerBId),
        eq(people.treeId, parseInt(treeId))
      ));

    if (!partnerAExists || !partnerBExists) {
      return NextResponse.json(
        { error: "指定された人物が見つかりません" },
        { status: 404 }
      );
    }

    const [newPartnership] = await db
      .insert(partnerships)
      .values({
        treeId: parseInt(treeId),
        partnerAId,
        partnerBId,
        startDate: validatedData.startDate || null,
        endDate: validatedData.endDate || null,
        type: validatedData.type,
      })
      .returning();

    return NextResponse.json(newPartnership, { status: 201 });
  } catch (error) {
    console.error("Failed to create partnership:", error);
    return NextResponse.json(
      { error: "Failed to create partnership" },
      { status: 500 }
    );
  }
}
