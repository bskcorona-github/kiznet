import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 200 * 1024; // 200KB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `ファイルサイズが大きすぎます。${MAX_FILE_SIZE / 1024}KB以下にしてください。` 
      }, { status: 400 });
    }

    // ファイル形式チェック（webpのみ許可）
    if (!file.type.includes("webp")) {
      return NextResponse.json({ 
        error: "WebP形式のファイルのみアップロード可能です。" 
      }, { status: 400 });
    }

    // Vercel Blobにアップロード
    const blob = await put(file.name, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      message: "写真をアップロードしました"
    });

  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ 
      error: "写真のアップロードに失敗しました" 
    }, { status: 500 });
  }
}
