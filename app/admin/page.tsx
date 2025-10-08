"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Macias Admin (no password) — matches landing page vibe
 * - Brand color: #f36f21
 * - Hero + glass card + soft gradient background
 * - Upload flow: /api/files/upload-url -> PUT to S3 -> /api/files/register
 * - Sanitizes folder to prevent CR/LF (%0D%0A) and slashes
 */

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const contentType = useMemo(
    () => (file?.type ? file.type : "application/pdf"),
    [file]
  );

  const disabled = !file || !email || busy;

  function sanitizeFolder(raw: string) {
    // Remove CR/LF, collapse slashes, trim
    const noNewlines = (raw || "").replace(/[\r\n]/g, "");
    const normalized = noNewlines.replace(/\\/g, "/").replace(/\/+/g, "/");
    return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  async function upload() {
    if (!file) return;
    setStatus("");
    setBusy(true);

    try {
      const safeFolder = sanitizeFolder(folder);

      // 1) Ask API for a signed PUT URL
      setStatus("Requesting upload URL…");
      const upRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No password anymore — only email is required (domain-gated server-side)
          "x-user-email": email,
        },
        body: JSON.stringify({
          folder: safeFolder,
          filename: file.name,
          contentType, // must match actual PUT
        }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        throw new Error(`Upload URL failed: ${upRes.status} ${txt}`);
      }

      const { url, key } = (await upRes.json()) as { url: string; key: string };

      // 2) PUT to S3 with the same Content-Type we signed with
      setStatus("Uploading to S3… (do not close this tab)");
      const put = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });

      if (!put.ok) {
        const txt = await put.text().catch(() => "");
        throw new Error(`S3 PUT failed: ${put.status} ${txt}`);
      }

      // 3) Register metadata (so tiles show immediately)
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
        },
        body: JSON.stringify(meta),
      });

      if (!reg.ok) {
        const txt = await reg.text().catch(() => "");
        throw new Error(`Register failed: ${reg.status} ${txt}`);
      }

      setStatus("✅ Uploaded & registered");
      // Optional reset
      // setFolder(""); setFile(null); if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen text-neutral-900 bg-[radial-gradient(1200px_700px_at_50%_-10%,#ffe7d7_0%,transparent_60%),linear-gradient(180deg,#fafafa,white)]">
      {/* Brand stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: "#f36f21" }} />

      {/* Hero (matches landing look) */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <img src="/favicon.png" alt="Macias" className="h-9 w-9 rounded-md shadow-sm" />
          <span className="text-sm font-semibold tracking-tight">Macias Plans Room — Admin</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Upload TxDOT plan PDFs
        </h1>
        <p className="mt-2 text-neutral-600 max-w-2xl">
          Use your <span className="font-medium">@maciasspecialty.com</span> email. Files are uploaded securely to S3 and appear for subcontractors immediately.
        </p>
      </div>

      {/* Card */}
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="rounded-2xl border border-neutral-200/70 bg-white/80 backdrop-blur shadow-[0_12px_30px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b bg-white/60">
            <h2 className="text-lg font-semibold tracking-tight">Upload a PDF</h2>
          </div>

          <div className="px-6 md:px-8 py-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-4">
              <LabeledInput
                label="Work Email"
                placeholder="you@maciasspecialty.com"
                value={email}
                onChange={setEmail}
              />
              <LabeledInput
                label={
                  <>
                    Folder <span className="text-neutral-400">(optional)</span>
                  </>
                }
                placeholder="e.g. Austin/IH35"
                value={folder}
                onChange={setFolder}
                hint="No line breaks; slashes OK. Example: Austin/IH35"
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
                {busy ? "Working…" : "Upload"}
              </button>

              <div className="min-h-[22px] text-sm text-neutral-700">{status}</div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs text-neutral-500 mb-2">Selected file</div>
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
              </div>

              <ul className="text-sm text-neutral-700 leading-6 list-disc pl-5">
                <li>Folder/filename must have **no line breaks**.</li>
                <li>S3 must allow CORS for <code>PUT</code>, <code>GET</code>, <code>HEAD</code> from your domains.</li>
                <li>
                  The <code>Content-Type</code> used to sign must match the PUT header (we send{" "}
                  <code>{contentType}</code>).
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- UI helper ---------- */

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
