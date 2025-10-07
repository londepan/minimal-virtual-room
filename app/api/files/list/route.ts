import { NextResponse } from "next/server";
import { s3, BUCKET } from "../../../../lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: "index.json" }));
    const text = await out.Body!.transformToString();
    const items = JSON.parse(text);
    return NextResponse.json({ items: Array.isArray(items) ? items : [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
