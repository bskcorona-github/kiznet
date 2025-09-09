import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { people } from "@/server/db/schema";
import { PersonSchema } from "@/types";
import { eq, ilike, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    const search = searchParams.get("search");
    const sex = searchParams.get("sex");
    const livingStatus = searchParams.get("livingStatus");

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId parameter is required" },
        { status: 400 }
      );
    }

    let query = db.select().from(people).where(eq(people.treeId, parseInt(treeId)));

    // Apply filters
    const conditions = [eq(people.treeId, parseInt(treeId))];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        ilike(people.firstName, searchTerm)
      );
      // Note: For OR condition with lastName, you'd need a more complex query
    }

    if (sex && sex !== "all") {
      conditions.push(eq(people.sex, sex as any));
    }

    if (livingStatus && livingStatus !== "all") {
      if (livingStatus === "deceased") {
        conditions.push(eq(people.isDeceased, true));
      } else if (livingStatus === "living") {
        conditions.push(eq(people.isDeceased, false));
      }
    }

    const allPeople = await db
      .select()
      .from(people)
      .where(and(...conditions));

    return NextResponse.json(allPeople);
  } catch (error) {
    console.error("Failed to fetch people:", error);
    return NextResponse.json(
      { error: "Failed to fetch people" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treeId, ...personData } = body;

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId is required" },
        { status: 400 }
      );
    }

    // 空文字列をnullに変換してからバリデーション
    const processedData = {
      ...personData,
      lastName: personData.lastName === "" ? null : personData.lastName,
      sex: personData.sex === "" ? null : personData.sex,
      birthOrder: personData.birthOrder === "" ? null : personData.birthOrder,
      birthDate: personData.birthDate === "" ? null : personData.birthDate,
      deathDate: personData.deathDate === "" ? null : personData.deathDate,
      email: personData.email === "" ? null : personData.email,
      phone: personData.phone === "" ? null : personData.phone,
      address: personData.address === "" ? null : personData.address,
      city: personData.city === "" ? null : personData.city,
      prefecture: personData.prefecture === "" ? null : personData.prefecture,
      country: personData.country === "" ? null : personData.country,
      lat: personData.lat === "" ? null : personData.lat,
      lng: personData.lng === "" ? null : personData.lng,
      note: personData.note === "" ? null : personData.note,
      positionX: personData.positionX,
      positionY: personData.positionY,
    };
    
    const validatedData = PersonSchema.parse(processedData);

    const [newPerson] = await db
      .insert(people)
      .values({
        treeId: parseInt(treeId),
        firstName: validatedData.firstName,
        lastName: validatedData.lastName || null,
        sex: validatedData.sex || null,
        birthOrder: validatedData.birthOrder || null,
        birthDate: validatedData.birthDate || null,
        deathDate: validatedData.deathDate || null,
        isDeceased: validatedData.isDeceased,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        prefecture: validatedData.prefecture || null,
        country: validatedData.country || null,
        lat: validatedData.lat || null,
        lng: validatedData.lng || null,
        note: validatedData.note || null,
        positionX: validatedData.positionX || null,
        positionY: validatedData.positionY || null,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newPerson, { status: 201 });
  } catch (error) {
    console.error("Failed to create person:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 }
    );
  }
}
