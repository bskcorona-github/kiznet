import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 現在のテーブル構造を確認
    const result = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('trees', 'people', 'relationships', 'partnerships')
      ORDER BY table_name, ordinal_position;
    `);
    
    return NextResponse.json({
      message: "Database schema check",
      tables: result.rows
    });
  } catch (error) {
    console.error("Failed to check schema:", error);
    return NextResponse.json(
      { error: "Failed to check schema", details: error },
      { status: 500 }
    );
  }
}