import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      AWS_REGION: !!process.env.AWS_REGION,
      S3_BUCKET: !!process.env.S3_BUCKET,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      SIGN_URL_TTL_SECONDS: !!process.env.SIGN_URL_TTL_SECONDS,
      ADMIN_DOMAIN: process.env.ADMIN_DOMAIN,
      HAS_ADMIN_PASS: !!process.env.ADMIN_PASS
    }
  });
}
