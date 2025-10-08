import { NextResponse } from "next/server";

function isAdmin(req: Request) {
  const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();
  const pass = (req.headers.get("x-admin-pass") || "").trim();
  const allowedDomain = (process.env.ADMIN_DOMAIN || "").trim().toLowerCase();
  const adminPass = (process.env.ADMIN_PASS || "").trim();
  const emailOk = allowedDomain.length > 0 && email.endsWith(`@${allowedDomain}`);
  const passOk = adminPass.length > 0 && pass === adminPass;
  return emailOk && passOk;
}

// Minimal stub: accept metadata and no-op (or write to KV/DB if you added one)
export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  // TODO: persist `body` somewhere (KV/DB). For now, echo back.
  return NextResponse.json({ ok: true, received: body });
}
