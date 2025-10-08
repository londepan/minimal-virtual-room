"use client";

import { useState, useMemo } from "react";

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
      // 1) Get signed PUT URL (must include the exact Content-Type we’ll send)
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
          contentType,
        }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        setStatus(`Request failed: ${upRes.status} ${txt}`.trim());
        return;
      }

      const { url, key } = await upRes.json();

      // 2) Upload file to S3 with the SAME Content-Type as signed
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

      // 3) (Optional) register so it shows up immediately on the homepage
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
      // Optional: reset
      // setFolder(""); setFile(null);
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    }
  }

  const disabled = !file || !email || !pass;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Macias"
              className="h-8 w-8 rounded-lg shadow-sm"
            />
            <div className="font-semibold tracking-tight">Macias Admin</div>
          </div>
          <a
            href="/"
            className="text-sm text-neutral-600 hover:text-black transition"
          >
            ← Back to Plans
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold">Upload Plans</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Use your <span className="font-medium">@maciasspecialty.com</span> email and admin password.
        </p>

        <div className="mt-6 grid gap-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21] transition"
              placeholder="lm@maciasspecialty.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin password</label>
            <input
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21] transition"
              type="password"
              placeholder="••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Folder (optional)
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#f36f21]/30 focus:border-[#f36f21] transition"
                placeholder="e.g. Austin/IH35"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Avoid line breaks; use simple path like <code>District/Highway</code>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">PDF</label>
              <input
                className="w-full border rounded-lg px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 hover:file:bg-neutral-200 transition"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Detected type: <code>{contentType}</code>
              </p>
            </div>
          </div>

          <button
            onClick={upload}
            disabled={disabled}
            className="group inline-flex items-center justify-center rounded-lg bg-[#f36f21] px-4 py-2 font-medium text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span className="mr-1">Upload</span>
            <svg
              className="h-4 w-4 transform group-hover:-translate-y-0.5 transition"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 15a1 1 0 011-1h3v-3H5l5-5 5 5h-2v3h3a1 1 0 011 1v2a1 1 0 01-1 
                1H4a1 1 0 01-1-1v-2z" />
            </svg>
          </button>

          <div className="min-h-[24px] text-sm text-neutral-700">{status}</div>

          <div className="text-xs text-neutral-400">
            If you see <em>Failed to fetch</em>, it’s usually CORS or a header mismatch. Make sure your S3
            CORS is saved and the signed URL contains no <code>%0D%0A</code>.
          </div>
        </div>
      </main>
    </div>
  );
}
