"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Macias Admin (passwordless, domain-gated)
 * Visual style matches landing page: warm gradient, thin brand stripe, glass card, subtle hover.
 * Upload flow: /api/files/upload-url -> S3 PUT -> /api/files/register
 * CORS-safe: only sends Content-Type on PUT; sanitizes "folder" to strip CR/LF & backslashes.
 */

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<React.ReactNode>("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  const contentType = useMemo(
    () => (file?.type && file.type !== "" ? file.type : "application/pdf"),
    [file]
  );

  const disabled = !file || !email || busy;

  // ------- helpers -------
  function sanitizeFolder(raw: string) {
    // remove CR/LF that cause `%0D%0A` in signed URLs and break CORS
    const noNewlines = (raw || "").replace(/[\r\n]/g, "");
    // normalize slashes
    const normalized = noNewlines.replace(/\\/g, "/").replace(/\/+/g, "/");
    // trim leading / trailing slashes
    return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setStatus("");

    try {
      // 1) Ask Next API to sign a PUT for S3
      const safeFolder = sanitizeFolder(folder);

      setStatus("Requesting upload URL…");
      const upRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Server checks this endsWith @maciasspecialty.com (no password needed)
          "x-user-email": email.trim().toLowerCase(),
        },
        body: JSON.stringify({
          folder: safeFolder,
          filename: file.name,
          contentType, // must match the actual PUT Content-Type
        }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        throw new Error(`Upload URL failed (${upRes.status}): ${txt}`);
      }

      const { url, key } = (await upRes.json()) as { url: string; key: string };

      // 2) PUT the file to S3 — IMPORTANT: only set Content-Type (avoid custom headers that break CORS)
      setStatus("Uploading to S3…");
      const put = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });

      if (!put.ok) {
        const txt = await put.text().catch(() => "");
        // Some browsers hide body on CORS fail; expose a helpful hint
        throw new Error(
          `S3 PUT failed (${put.status}). ${
            txt || "If this is a CORS error, fix S3 CORS & remove newlines from Folder."
          }`
        );
      }

      // 3) Register metadata (so the file can appear in tiles immediately)
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
          "x-user-email": email.trim().toLowerCase(),
        },
        body: JSON.stringify(meta),
      });

      if (!reg.ok) {
        const txt = await reg.text().catch(() => "");
        throw new Error(`Register failed (${reg.status}): ${txt}`);
      }

      setStatus(
        <span className="inline-flex items-center gap-2 text-green-700">
          <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
          Uploaded & registered — {key}
        </span>
      );

      // Optional reset
      // setFolder(""); setFile(null); if (inputRef.current) inputRef.current.value = "";
    } catch (e: any) {
      // Improve surfacing “TypeError: Failed to fetch” with guidance
      const hint =
        (e?.message || "").includes("Failed to fetch") ||
        (e?.message || "").toLowerCase().includes("network")
          ? " This is usually S3 CORS or a newline in Folder. See notes below."
          : "";
      setStatus(
        <span className="text-red-700">
          Error: {e?.message || String(e)}
          {hint}
        </span>
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen text-neutral-900 bg-[radial-gradient(1100px_600px_at_50%_-10%,#ffe7d7_0%,transparent_60%),linear-gradient(180deg,#fafafa,white)]">
      {/* Brand stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: "#f36f21" }} />

      {/* Top bar */}
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Macias" className="h-9 w-9 rounded-md shadow-sm" />
          <div className="font-semibold tracking-tight">Macias Plans Room · Admin</div>
        </div>
        <a
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900 transition underline-offset-4 hover:underline"
        >
          Back to landing
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-2">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Upload TxDOT PDFs</h1>
        <p className="mt-2 text-neutral-600 max-w-2xl">
          Use your <span className="font-medium">@maciasspecialty.com</span> email. Files upload to S3 and are
          immediately available to your subcontractors.
        </p>
      </section>

      {/* Glass card */}
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-neutral-200/70 bg-white/80 backdrop-blur shadow-[0_16px_40px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b bg-white/60 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Upload a PDF</h2>
            <div className="text-xs text-neutral-500">
              Only <code>Content-Type</code> is sent on PUT (CORS-safe)
            </div>
          </div>

          <div className="px-6 md:px-8 py-6 grid gap-8 md:grid-cols-2">
            {/* Left column */}
            <div className="grid gap-4">
              <Input
                label="Work Email"
                placeholder="you@maciasspecialty.com"
                value={email}
                onChange={setEmail}
              />

              <Input
                label={
                  <>
                    Folder <span className="text-neutral-400">(optional)</span>
                  </>
                }
                placeholder="e.g. Austin/IH35"
                value={folder}
                onChange={setFolder}
                hint="No line breaks; slashes OK (Austin/IH35)."
              />

              <div className="grid gap-1">
                <label className="text-sm font-medium">PDF File</label>
                <input
                  ref={inputRef}
                  className="w-full rounded-lg border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 hover:file:bg-neutral-200 transition outline-none focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21]"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-[11px] text-neutral-500">
                  Detected type:&nbsp;
                  <code className="rounded bg-neutral-100 px-1 py-0.5">{contentType}</code>
                </p>
              </div>

              <button
                onClick={upload}
                disabled={disabled}
                className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ backgroundColor: "#f36f21" }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Uploading…
                  </span>
                ) : (
                  "Upload"
                )}
              </button>

              <div className="min-h-[24px] text-sm">{status}</div>
            </div>

            {/* Right column */}
            <aside className="grid gap-3">
              <Card title="Selected file">
                {file ? (
                  <div className="text-sm">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-neutral-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {contentType}
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm">No file chosen.</div>
                )}
              </Card>

              <Card title="Tips">
                <ul className="text-sm text-neutral-700 leading-6 list-disc pl-5">
                  <li>Folder **must not** contain line breaks.</li>
                  <li>S3 bucket CORS must allow <code>PUT</code>, <code>GET</code>, <code>HEAD</code>.</li>
                  <li>
                    The <code>Content-Type</code> we sign is the <code>Content-Type</code> we PUT (
                    <code>{contentType}</code>).
                  </li>
                </ul>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- tiny UI primitives ---------- */

function Input({
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="text-xs font-medium text-neutral-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
