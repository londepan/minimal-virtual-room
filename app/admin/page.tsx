"use client";

import { useMemo, useState, useRef } from "react";

/**
 * Macias Admin — refined minimal UI
 * - Brand: #f36f21
 * - Glass card, rounded-xl, soft shadow
 * - Subtle hovers, progress bar, file preview
 * - Flow: POST /api/files/upload-url -> PUT S3 -> POST /api/files/register
 */

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const contentType = useMemo(
    () => (file?.type ? file.type : "application/pdf"),
    [file]
  );

  const disabled = !file || !email || !pass || busy;

  async function upload() {
    if (!file) return;
    setStatus("");
    setProgress(null);
    setBusy(true);

    try {
      // 1) Ask for signed URL
      setStatus("Requesting upload URL…");
      const upRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email,
          "x-admin-pass": pass,
        },
        body: JSON.stringify({
          folder,
          filename: file.name,
          contentType, // must match PUT
        }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        throw new Error(`Upload URL failed: ${upRes.status} ${txt}`);
      }

      const { url, key } = (await upRes.json()) as { url: string; key: string };

      // 2) PUT to S3 (track progress with XHR for better UX)
      setStatus("Uploading to S3…");
      await putWithProgress(url, file, contentType, (p) => setProgress(p));

      // 3) Register metadata so it appears immediately
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
        throw new Error(`Uploaded ✓ but register failed (${reg.status})`);
      }

      setStatus("✅ Uploaded & registered");
      // Optional reset:
      // setFolder(""); setFile(null); inputRef.current?.value && (inputRef.current.value = "");
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_50%_-10%,#ffe7d7_0%,transparent_60%),linear-gradient(180deg,#fafafa,white)] text-neutral-900">
      {/* Top brand bar */}
      <div className="h-1 w-full" style={{ backgroundColor: "#f36f21" }} />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Macias"
              className="h-8 w-8 rounded-md shadow-sm"
            />
            <div className="text-sm font-semibold tracking-tight">Macias Admin</div>
          </div>
          <a
            href="/"
            className="text-sm text-neutral-600 hover:text-black transition"
          >
            ← Back to Plans
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Card: Upload */}
          <section className="group rounded-2xl border border-neutral-200/70 bg-white/80 backdrop-blur shadow-[0_12px_30px_rgba(0,0,0,0.06)] overflow-hidden transition">
            <div className="px-6 md:px-8 py-6 border-b bg-white/60">
              <h1 className="text-xl font-semibold tracking-tight">Upload Plans (PDF)</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Use your <span className="font-medium">@maciasspecialty.com</span> email and the admin password.
              </p>
            </div>

            <div className="px-6 md:px-8 py-6 grid gap-4">
              <LabeledInput
                label="Work Email"
                placeholder="you@maciasspecialty.com"
                value={email}
                onChange={setEmail}
              />
              <LabeledInput
                label="Admin Password"
                placeholder="••••••"
                type="password"
                value={pass}
                onChange={setPass}
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
                hint="Use simple paths like District/Highway (no line breaks)."
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

              {progress !== null && (
                <div className="mt-1">
                  <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                        backgroundColor: "#f36f21",
                      }}
                    />
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">{Math.round(progress)}%</div>
                </div>
              )}

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
          </section>

          {/* Card: Preview & Hints */}
          <aside className="rounded-2xl border border-neutral-200/70 bg-white/70 backdrop-blur shadow-[0_12px_30px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b bg-white/60">
              <h2 className="text-lg font-semibold tracking-tight">Preview & Tips</h2>
            </div>
            <div className="px-6 md:px-8 py-6 grid gap-4">
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
                <li>Ensure S3 CORS allows <code>PUT</code>, <code>GET</code>, and <code>HEAD</code> from your domains.</li>
                <li>Folder/filename should not contain line breaks (<code>%0D%0A</code>).</li>
                <li>Upload uses the same <code>Content-Type</code> for sign & PUT.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

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

/**
 * PUT with progress (XMLHttpRequest for reliable upload progress in the browser)
 */
function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = (evt.loaded / evt.total) * 100;
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 PUT failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during S3 PUT"));
    xhr.send(blob);
  });
}
