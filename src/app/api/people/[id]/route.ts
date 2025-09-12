import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { people } from "@/server/db/schema";
import { PersonSchema } from "@/types";
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

    const [person] = await db.select().from(people).where(eq(people.id, id));
    
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error("Failed to fetch person:", error);
    return NextResponse.json(
      { error: "Failed to fetch person" },
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
    const validatedData = PersonSchema.parse(body);

    const [updatedPerson] = await db
      .update(people)
      .set({
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
        photoUrl: validatedData.photoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(people.id, id))
      .returning();

    if (!updatedPerson) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPerson);
  } catch (error) {
    console.error("Failed to update person:", error);
    return NextResponse.json(
      { error: "Failed to update person" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    
    // 空文字列をnullに変換してからバリデーション
    const processedBody = {
      ...body,
      lastName: body.lastName === "" ? null : body.lastName,
      sex: body.sex === "" ? null : body.sex,
      birthOrder: body.birthOrder === "" ? null : body.birthOrder,
      birthDate: body.birthDate === "" ? null : body.birthDate,
      deathDate: body.deathDate === "" ? null : body.deathDate,
      email: body.email === "" ? null : body.email,
      phone: body.phone === "" ? null : body.phone,
      address: body.address === "" ? null : body.address,
      city: body.city === "" ? null : body.city,
      prefecture: body.prefecture === "" ? null : body.prefecture,
      country: body.country === "" ? null : body.country,
      lat: body.lat === "" ? null : body.lat,
      lng: body.lng === "" ? null : body.lng,
      note: body.note === "" ? null : body.note,
      photoUrl: body.photoUrl === "" ? null : body.photoUrl,
      positionX: body.positionX,
      positionY: body.positionY,
    };
    
    const validatedData = PersonSchema.parse(processedBody);

    const [updatedPerson] = await db
      .update(people)
      .set({
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
        photoUrl: validatedData.photoUrl || null,
        positionX: validatedData.positionX || null,
        positionY: validatedData.positionY || null,
        updatedAt: new Date(),
      })
      .where(eq(people.id, id))
      .returning();

    if (!updatedPerson) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPerson);
  } catch (error) {
    console.error("Failed to update person (PATCH):", error);
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Failed to update person", details: error instanceof Error ? error.message : String(error) },
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

    const [deletedPerson] = await db
      .delete(people)
      .where(eq(people.id, id))
      .returning();

    if (!deletedPerson) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Person deleted successfully" });
  } catch (error) {
    console.error("Failed to delete person:", error);
    return NextResponse.json(
      { error: "Failed to delete person" },
      { status: 500 }
    );
  }
}
