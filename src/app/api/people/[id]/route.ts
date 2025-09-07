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
