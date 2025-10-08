import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, SIGN_TTL } from "@/lib/s3";

function isAdmin(req: Request) {
  const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();
  const pass  = (req.headers.get("x-admin-pass") || "").trim();
  const allowed = (process.env.ADMIN_DOMAIN || "").trim().toLowerCase();
  const adminPass = (process.env.ADMIN_PASS || "").trim();
  return allowed && email.endsWith(`@${allowed}`) && adminPass && pass === adminPass;
}

function cleanSegment(s: string) {
  // strip CR/LF, trim spaces, collapse slashes, strip leading/trailing slashes
  return s.replace(/[\r\n]+/g, "").replace(/\s+/g, " ").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const rawFolder: string = body.folder ?? "";
  const rawFilename: string = body.filename ?? "";
  const contentType: string | undefined = body.contentType || undefined;

  const folder = cleanSegment(String(rawFolder));
  const filename = cleanSegment(String(rawFilename));
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const key = folder ? `${folder}/${filename}` : filename;

  const putCmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(contentType ? { ContentType: contentType } : {}),
  });

  const url = await getSignedUrl(s3, putCmd, { expiresIn: SIGN_TTL });
  return NextResponse.json({ url, key, contentType: contentType || null });
}
