"use client";

import { useState } from "react";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  const upload = async () => {
    if (!file) return;
    setStatus("");

    try {
      const contentType = file.type || "application/pdf";

      // 1) Ask API for a pre-signed PUT URL
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
          contentType, // MUST match the header we send to S3 below
        }),
      });

      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "");
        setStatus(`Request failed: ${upRes.status} ${txt}`);
        return;
      }

      const { url, key } = await upRes.json();

      // 2) Upload the file to S3 using the signed URL
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

      // 3) (Optional) Register metadata so it appears for users immediately
      setStatus("Registering metadata…");
      const meta = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[Pp][Dd][Ff]$/, ""),
        district: "",
        csj: "",
        highway: "",
        letDate: new Date().toISOString().slice(0, 10),
        version: "v1",
        size: `${Math.ceil(file.size / 1024 / 1024)} MB`,
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
        setStatus(`Register failed (${reg.status})`);
        return;
      }

      setStatus(`✅ Uploaded & registered: ${key}`);
      // Optional: reset form
      // setFolder(""); setFile(null);
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold">Admin — Upload Plans</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Use your @maciasspecialty.com email and the admin password to upload PDFs directly to S3.
        </p>

        <div className="mt-6 grid gap-3">
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Your work email (@maciasspecialty.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Admin password"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Folder (optional, e.g. Austin/IH35)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={upload}
            disabled={!file || !email || !pass}
            className="inline-flex items-center justify-center rounded-md bg-[#f36f21] px-4 py-2 font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Upload
          </button>

          <div className="text-sm text-neutral-600 min-h-[1.5rem]">{status}</div>

          <div className="text-xs text-neutral-400">
            Tip: If you see “Failed to fetch” on upload, verify S3 CORS and that the signed URL doesn’t contain
            any “%0D%0A” (line breaks) in folder/filename.
          </div>
        </div>
      </div>
    </div>
  );
}
