import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { relationships, partnerships } from "@/server/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Starting Kinjo family data fix...");

    // 1. 金城智子（33）から子どもたち（28, 29, 30, 31）への親子関係を追加
    const childrenIds = [28, 29, 30, 31];
    
    for (const childId of childrenIds) {
      // 既存の関係をチェック
      const existingRelationship = await db.select()
        .from(relationships)
        .where(and(
          eq(relationships.parentId, 33),
          eq(relationships.childId, childId)
        ));

      if (existingRelationship.length === 0) {
        // 関係が存在しない場合は追加
        await db.insert(relationships).values({
          parentId: 33, // 金城智子
          childId: childId,
          treeId: 1
        });
        console.log(`✅ Added relationship: 金城智子(33) → child(${childId})`);
      } else {
        console.log(`ℹ️ Relationship already exists: 金城智子(33) → child(${childId})`);
      }
    }

    // 2. 全ての配偶者関係を確認（デバッグ用）
    const allPartnerships = await db.select().from(partnerships);
    console.log("🔍 All partnerships:", allPartnerships);

    // 金城正治（19）に関連する配偶者関係
    const masaharuPartnerships = allPartnerships.filter(p => 
      p.partnerAId === 19 || p.partnerBId === 19
    );
    console.log("🔍 金城正治(19) partnerships:", masaharuPartnerships);

    // 3. 金城正治（19）と金城智子（33）の配偶者関係を確認・追加
    const correctPartnership = allPartnerships.find(p =>
      (p.partnerAId === 19 && p.partnerBId === 33) ||
      (p.partnerAId === 33 && p.partnerBId === 19)
    );

    if (!correctPartnership) {
      // 配偶者関係が存在しない場合は追加
      await db.insert(partnerships).values({
        partnerAId: 19, // 金城正治
        partnerBId: 33, // 金城智子
        treeId: 1
      });
      console.log("✅ Added partnership: 金城正治(19) ↔ 金城智子(33)");
    } else {
      console.log("ℹ️ Partnership already exists: 金城正治(19) ↔ 金城智子(33)");
    }

    // 4. 間違った配偶者関係があれば削除
    for (const partnership of masaharuPartnerships) {
      // 金城正治と33以外の配偶者関係は削除
      const partnerId = partnership.partnerAId === 19 ? partnership.partnerBId : partnership.partnerAId;
      if (partnerId !== 33) {
        await db.delete(partnerships).where(eq(partnerships.id, partnership.id));
        console.log(`🗑️ Removed wrong partnership: 金城正治(19) ↔ person(${partnerId})`);
      }
    }

    console.log("🎉 Kinjo family data fix completed!");

    return NextResponse.json({ 
      success: true, 
      message: "Kinjo family data has been fixed successfully" 
    });

  } catch (error) {
    console.error("❌ Error fixing Kinjo family data:", error);
    return NextResponse.json(
      { error: "Failed to fix Kinjo family data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
