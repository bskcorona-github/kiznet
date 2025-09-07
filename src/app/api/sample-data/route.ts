import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { trees, people, relationships, partnerships } from "@/server/db/schema";

const sampleData = {
  tree: {
    name: "サンプル家系図",
    description: "3世代のサンプル家族データ",
  },
  people: [
    // 祖父母世代 (第1世代)
    {
      firstName: "太郎",
      lastName: "田中",
      sex: "male" as const,
      birthDate: "1930-03-15",
      deathDate: "2010-08-22",
      isDeceased: true,
      city: "東京都",
      prefecture: "東京都",
      note: "家族の大黒柱として皆に愛された祖父",
    },
    {
      firstName: "花子",
      lastName: "田中",
      sex: "female" as const,
      birthDate: "1933-07-08",
      deathDate: "2015-12-03",
      isDeceased: true,
      city: "東京都",
      prefecture: "東京都",
      note: "優しく料理上手な祖母",
    },
    {
      firstName: "次郎",
      lastName: "佐藤",
      sex: "male" as const,
      birthDate: "1928-11-20",
      deathDate: "2005-04-10",
      isDeceased: true,
      city: "大阪市",
      prefecture: "大阪府",
    },
    {
      firstName: "美代子",
      lastName: "佐藤",
      sex: "female" as const,
      birthDate: "1932-01-25",
      isDeceased: false,
      city: "大阪市",
      prefecture: "大阪府",
      phone: "06-1234-5678",
    },
    
    // 父母世代 (第2世代)
    {
      firstName: "一郎",
      lastName: "田中",
      sex: "male" as const,
      birthDate: "1960-05-10",
      isDeceased: false,
      email: "ichiro.tanaka@example.com",
      phone: "03-1234-5678",
      city: "世田谷区",
      prefecture: "東京都",
      address: "世田谷区田中町1-2-3",
      note: "会社員、趣味は釣り",
    },
    {
      firstName: "恵子",
      lastName: "田中",
      sex: "female" as const,
      birthDate: "1963-09-18",
      isDeceased: false,
      email: "keiko.tanaka@example.com",
      phone: "03-1234-5679",
      city: "世田谷区",
      prefecture: "東京都",
      address: "世田谷区田中町1-2-3",
      note: "パート勤務、料理と園芸が趣味",
    },
    {
      firstName: "二郎",
      lastName: "田中",
      sex: "male" as const,
      birthDate: "1965-12-03",
      isDeceased: false,
      email: "jiro.tanaka@example.com",
      city: "横浜市",
      prefecture: "神奈川県",
      note: "エンジニア、独身",
    },
    {
      firstName: "三郎",
      lastName: "佐藤",
      sex: "male" as const,
      birthDate: "1958-08-14",
      isDeceased: false,
      city: "大阪市",
      prefecture: "大阪府",
    },
    {
      firstName: "桜子",
      lastName: "佐藤",
      sex: "female" as const,
      birthDate: "1961-04-30",
      isDeceased: false,
      city: "大阪市",
      prefecture: "大阪府",
      note: "三郎の妹、独身",
    },
    {
      firstName: "由美",
      lastName: "佐藤",
      sex: "female" as const,
      birthDate: "1960-02-14",
      isDeceased: false,
      city: "大阪市",
      prefecture: "大阪府",
      note: "三郎の妻",
    },
    
    // 子世代 (第3世代)
    {
      firstName: "健太",
      lastName: "田中",
      sex: "male" as const,
      birthDate: "1990-07-25",
      isDeceased: false,
      email: "kenta.tanaka@example.com",
      city: "渋谷区",
      prefecture: "東京都",
      note: "IT企業勤務",
    },
    {
      firstName: "美咲",
      lastName: "田中",
      sex: "female" as const,
      birthDate: "1993-11-12",
      isDeceased: false,
      email: "misaki.tanaka@example.com",
      city: "新宿区",
      prefecture: "東京都",
      note: "デザイナー",
    },
    {
      firstName: "大輔",
      lastName: "佐藤",
      sex: "male" as const,
      birthDate: "1988-03-08",
      isDeceased: false,
      city: "大阪市",
      prefecture: "大阪府",
    },
    {
      firstName: "愛美",
      lastName: "佐藤",
      sex: "female" as const,
      birthDate: "1991-10-15",
      isDeceased: false,
      city: "京都市",
      prefecture: "京都府",
    },
  ],
  relationships: [
    // 太郎・花子 → 一郎、二郎
    { parentIndex: 0, childIndex: 4 }, // 太郎 → 一郎
    { parentIndex: 1, childIndex: 4 }, // 花子 → 一郎
    { parentIndex: 0, childIndex: 6 }, // 太郎 → 二郎
    { parentIndex: 1, childIndex: 6 }, // 花子 → 二郎
    
    // 次郎・美代子 → 三郎
    { parentIndex: 2, childIndex: 7 }, // 次郎 → 三郎
    { parentIndex: 3, childIndex: 7 }, // 美代子 → 三郎
    
    // 次郎・美代子 → 桜子
    { parentIndex: 2, childIndex: 8 }, // 次郎 → 桜子
    { parentIndex: 3, childIndex: 8 }, // 美代子 → 桜子
    
    // 一郎・恵子 → 健太、美咲
    { parentIndex: 4, childIndex: 9 }, // 一郎 → 健太
    { parentIndex: 5, childIndex: 9 }, // 恵子 → 健太
    { parentIndex: 4, childIndex: 10 }, // 一郎 → 美咲
    { parentIndex: 5, childIndex: 10 }, // 恵子 → 美咲
    
    // 三郎・由美 → 大輔、愛美
    { parentIndex: 7, childIndex: 12 }, // 三郎 → 大輔
    { parentIndex: 9, childIndex: 12 }, // 由美 → 大輔
    { parentIndex: 7, childIndex: 13 }, // 三郎 → 愛美
    { parentIndex: 9, childIndex: 13 }, // 由美 → 愛美
  ],
  partnerships: [
    // 祖父母世代の結婚
    { partnerAIndex: 0, partnerBIndex: 1, startDate: "1955-06-15", type: "marriage" as const }, // 太郎・花子
    { partnerAIndex: 2, partnerBIndex: 3, startDate: "1952-04-20", type: "marriage" as const }, // 次郎・美代子
    
    // 父母世代の結婚
    { partnerAIndex: 4, partnerBIndex: 5, startDate: "1988-10-08", type: "marriage" as const }, // 一郎・恵子
    { partnerAIndex: 7, partnerBIndex: 9, startDate: "1985-03-22", type: "marriage" as const }, // 三郎・由美
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treeId } = body;

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId is required" },
        { status: 400 }
      );
    }

    const numericTreeId = parseInt(treeId);
    if (isNaN(numericTreeId)) {
      return NextResponse.json(
        { error: "Invalid treeId" },
        { status: 400 }
      );
    }

    // Insert sample people
    const insertedPeople = [];
    for (const personData of sampleData.people) {
      const [newPerson] = await db
        .insert(people)
        .values({
          treeId: numericTreeId,
          ...personData,
          updatedAt: new Date(),
        })
        .returning();
      insertedPeople.push(newPerson);
    }

    // Insert sample relationships
    const insertedRelationships = [];
    for (const relData of sampleData.relationships) {
      const parentId = insertedPeople[relData.parentIndex].id;
      const childId = insertedPeople[relData.childIndex].id;
      
      const [newRelationship] = await db
        .insert(relationships)
        .values({
          treeId: numericTreeId,
          parentId,
          childId,
        })
        .returning();
      insertedRelationships.push(newRelationship);
    }

    // Insert sample partnerships
    const insertedPartnerships = [];
    for (const partData of sampleData.partnerships) {
      const partnerAId = insertedPeople[partData.partnerAIndex].id;
      const partnerBId = insertedPeople[partData.partnerBIndex].id;
      
      // Normalize IDs (smaller first)
      const normalizedPartnerAId = Math.min(partnerAId, partnerBId);
      const normalizedPartnerBId = Math.max(partnerAId, partnerBId);
      
      const [newPartnership] = await db
        .insert(partnerships)
        .values({
          treeId: numericTreeId,
          partnerAId: normalizedPartnerAId,
          partnerBId: normalizedPartnerBId,
          startDate: partData.startDate,
          type: partData.type,
        })
        .returning();
      insertedPartnerships.push(newPartnership);
    }

    return NextResponse.json({
      message: "Sample data inserted successfully",
      data: {
        people: insertedPeople.length,
        relationships: insertedRelationships.length,
        partnerships: insertedPartnerships.length,
      },
    });
  } catch (error) {
    console.error("Failed to insert sample data:", error);
    return NextResponse.json(
      { error: "Failed to insert sample data" },
      { status: 500 }
    );
  }
}
