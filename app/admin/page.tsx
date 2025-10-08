"use client";

import { useMemo, useState } from "react";

/**
 * Macias Admin — classic minimal card (like the earlier version)
 * - Brand color: #f36f21
 * - Soft glass background, rounded-xl, shadow, subtle hovers
 * - Exact upload flow preserved (signed URL -> PUT to S3 -> register)
 */
export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  const contentType = useMemo(
    () => (file?.type ? file.type : "application/pdf"),
    [file]
  );

  async function upload() {
    if (!file) return;
    setStatus("");

    try {
      // 1) Signed URL
      setStatus("Requesting upload URL…");
      const upRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email,
          "x-admin-pass": pass,
        },
        body: JSON.stringify({ folder, filename: file.name, contentType }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        setStatus(`Request failed: ${upRes.status} ${txt}`.trim());
        return;
      }
      const { url, key } = (await upRes.json()) as { url: string; key: string };

      // 2) PUT to S3 with SAME content-type
      setStatus("Uploading to S3…");
      const put = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) {
        const errText = await put.text().catch(() => "");
        setStatus(`Upload failed: ${put.status} ${errText || ""}`.trim());
        return;
      }

      // 3) Register so it shows up right away
      setStatus("Registering metadata…");
      const meta = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[Pp][Dd][Ff]$/, ""),
        district: "",
        csj: "",
        highway: "",
        letDate: new Date().toISOString().slice(0, 10),
        version: "v1",
        size: `${Math.max(1, Math.ceil((file.size || 0) / 1024 / 1024))} MB`,
        tags: [],
        s3Key: key,
        createdAt: new Date().toISOString(),
      };

      const reg = await fetch("/api/files/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email,
          "x-admin-pass": pass,
        },
        body: JSON.stringify(meta),
      });

      if (!reg.ok) {
        setStatus(`Uploaded ✓ but register failed (${reg.status})`);
        return;
      }

      setStatus(`✅ Uploaded & registered: ${key}`);
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    }
  }

  const disabled = !file || !email || !pass;

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_600px_at_50%_-20%,#ffe7d7_0%,transparent_60%),linear-gradient(180deg,#fafafa,white)]">
      {/* Top bar accent */}
      <div className="h-1 w-full" style={{ backgroundColor: "#f36f21" }} />

      {/* Header (slim, balanced) */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/80 border-b">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Macias" className="h-7 w-7 rounded-md shadow-sm" />
            <span className="text-sm font-semibold tracking-tight">Macias Admin</span>
          </div>
          <a
            href="/"
            className="text-sm text-neutral-600 hover:text-black transition"
          >
            ← Back to Plans
          </a>
        </div>
      </header>

      {/* Centered card */}
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="mx-auto max-w-xl">
          <div className="group rounded-2xl border border-neutral-200/70 bg-white/80 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition">
            <div className="px-6 sm:px-8 py-6 border-b bg-white/60">
              <h1 className="text-xl font-semibold tracking-tight">Upload Plans (PDF)</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Sign in with your <span className="font-medium">@maciasspecialty.com</span> email and admin password.
              </p>
            </div>

            <div className="px-6 sm:px-8 py-6 grid gap-4">
              <LabeledInput
                label="Email"
                placeholder="lm@maciasspecialty.com"
                value={email}
                onChange={setEmail}
              />
              <LabeledInput
                label="Admin password"
                placeholder="••••••"
                type="password"
                value={pass}
                onChange={setPass}
              />
              <LabeledInput
                label={<>Folder <span className="text-neutral-400">(optional)</span></>}
                placeholder="e.g. Austin/IH35"
                value={folder}
                onChange={setFolder}
                hint="Avoid line breaks; use simple paths like District/Highway."
              />
              <div className="grid gap-1">
                <label className="text-sm font-medium">PDF file</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 hover:file:bg-neutral-200 transition outline-none focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21]"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-[11px] text-neutral-500">
                  Detected type: <code>{contentType}</code>
                </p>
              </div>

              <button
                onClick={upload}
                disabled={disabled}
                className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ backgroundColor: "#f36f21" }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                Upload
              </button>

              <div className="min-h-[22px] text-sm text-neutral-700">{status}</div>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 mt-3 text-center">
            If you see “Failed to fetch”, check S3 CORS and ensure the signed URL has no <code>%0D%0A</code>.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ————— UI helpers ————— */

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-[11px] text-neutral-500">{hint}</p> : null}
    </div>
  );
}
