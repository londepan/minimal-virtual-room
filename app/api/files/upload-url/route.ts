import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, SIGN_TTL } from "@/lib/s3";

function sanitizeFolder(raw?: string) {
  const s = (raw || "").replace(/[\r\n]/g, "").replace(/\\/g, "/").replace(/\/+/g, "/");
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();

    // Gate by domain (no password)
    const domain = (process.env.ADMIN_DOMAIN || "maciasspecialty.com").trim().toLowerCase();
    if (!email.endsWith(`@${domain}`)) {
      return NextResponse.json({ error: "Unauthorized: email must be company domain" }, { status: 403 });
    }

    const { folder, filename, contentType } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    const safeFolder = sanitizeFolder(folder);
    const key = safeFolder ? `${safeFolder}/${filename}` : filename;

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType || "application/pdf",
      }),
      { expiresIn: SIGN_TTL }
    );

    return NextResponse.json({ url, key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
