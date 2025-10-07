import { NextResponse } from "next/server";
import { s3, BUCKET } from "../../../../lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function isAdmin(req: Request) {
  const email = req.headers.get("x-user-email")?.toLowerCase() || "";
  const pass = req.headers.get("x-admin-pass") || "";
  const domain = process.env.ADMIN_DOMAIN || "maciasspecialty.com";
  const okDomain = email.endsWith(`@${domain}`);
  const okPass = !!process.env.ADMIN_PASS && pass === process.env.ADMIN_PASS;
  return okDomain && okPass;
}

// Quick GET so you can test the route URL
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/files/register" });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const item = await req.json();

  let current: any[] = [];
  try {
    const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: "index.json" }));
    const text = await got.Body!.transformToString();
    const parsed = JSON.parse(text);
    current = Array.isArray(parsed) ? parsed : [];
  } catch { current = []; }

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
