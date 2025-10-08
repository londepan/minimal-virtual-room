import { S3Client } from "@aws-sdk/client-s3";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const REGION  = need("AWS_REGION");
export const BUCKET  = need("S3_BUCKET");
export const SIGN_TTL = Number(process.env.SIGN_URL_TTL_SECONDS || "600");

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: need("AWS_ACCESS_KEY_ID"),
    secretAccessKey: need("AWS_SECRET_ACCESS_KEY"),
  },
});
