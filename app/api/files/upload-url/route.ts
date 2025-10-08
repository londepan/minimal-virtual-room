import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, SIGN_TTL } from "@/lib/s3";

function isAdmin(req: Request) {
  const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();
  const pass = (req.headers.get("x-admin-pass") || "").trim();
  const allowedDomain = (process.env.ADMIN_DOMAIN || "").trim().toLowerCase();
  const adminPass = (process.env.ADMIN_PASS || "").trim();
  const emailOk = allowedDomain.length > 0 && email.endsWith(`@${allowedDomain}`);
  const passOk = adminPass.length > 0 && pass === adminPass;
  return emailOk && passOk;
}

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { folder = "", filename } = await req.json().catch(() => ({} as any));
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const key = `${folder ? folder.replace(/\/+$/,"") + "/" : ""}${filename}`;

  // Optional one-shot diag (uncomment briefly if needed)
  // console.log("ADMIN_CHECK", {
  //   email: (req.headers.get("x-user-email") || "").trim(),
  //   domainEnv: (process.env.ADMIN_DOMAIN || "").trim(),
  //   passProvided: !!(req.headers.get("x-admin-pass") || "").trim(),
  //   hasAdminPassEnv: !!(process.env.ADMIN_PASS || "").trim()
  // });

  const putCmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/pdf",
  });

  const url = await getSignedUrl(s3, putCmd, { expiresIn: SIGN_TTL });
  return NextResponse.json({ url, key });
}
