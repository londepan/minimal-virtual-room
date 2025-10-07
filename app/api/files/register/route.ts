import { NextResponse } from "next/server";
import { s3, BUCKET } from "../../../../lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function isAdmin(req: Request) {
  const email = req.headers.get("x-user-email")?.toLowerCase() || "";
  const domain = process.env.ADMIN_DOMAIN || "maciasspecialty.com";
  return email.endsWith(`@${domain}`);
}

// Simple GET so you can test the route exists in a browser.
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/files/register" });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await req.json(); // id,title,district,csj,highway,letDate,version,size,tags[],s3Key,createdAt

  // read index.json (if missing => empty array)
  let current: any[] = [];
  try {
    const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: "index.json" }));
    const text = await got.Body!.transformToString();
    const parsed = JSON.parse(text);
    current = Array.isArray(parsed) ? parsed : [];
  } catch {
    current = [];
  }

  // upsert by id; newest first
  const idx = current.findIndex((x) => x.id === item.id);
  if (idx >= 0) current[idx] = item;
  else current.unshift(item);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: "index.json",
    ContentType: "application/json",
    Body: JSON.stringify(current, null, 2),
  }));

  return NextResponse.json({ ok: true, count: current.length });
}
