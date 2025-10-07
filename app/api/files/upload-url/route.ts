import { NextResponse } from "next/server";
import { s3, BUCKET, SIGN_TTL } from "../../../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "maciasspecialty.com";

export async function POST(req: Request) {
  const email = (req.headers.get("x-user-email") || "").toLowerCase();
  if (!email.endsWith(`@${ADMIN_DOMAIN}`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { folder = "", filename } = await req.json();
  if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

  const key = `${folder ? folder.replace(/\/+$/,'')+'/' : ''}${Date.now()}_${filename}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "application/pdf",
    }),
    { expiresIn: SIGN_TTL }
  );

  return NextResponse.json({ url, key });
}
