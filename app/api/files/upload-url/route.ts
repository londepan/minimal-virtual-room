import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, SIGN_TTL } from "../../../../lib/s3";

function isAdmin(req: Request) {
  const email = req.headers.get("x-user-email")?.toLowerCase() || "";
  const pass = req.headers.get("x-admin-pass") || "";
  const domain = process.env.ADMIN_DOMAIN || "maciasspecialty.com";
  const okDomain = email.endsWith(`@${domain}`);
  const okPass = !!process.env.ADMIN_PASS && pass === process.env.ADMIN_PASS;
  return okDomain && okPass;
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const folder = (body.folder || "").replace(/^\/+/, "").replace(/\.\./g, "");
  const filename = (body.filename || "plan.pdf").replace(/[^\w\-.]+/g, "_");
  const key = (folder ? `${folder}/` : "") + filename;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/pdf",
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: SIGN_TTL });
  return NextResponse.json({ url, key });
}
