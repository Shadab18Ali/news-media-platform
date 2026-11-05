"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Field, inputCls } from "./ui";

export function MediaUploader() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(files: FileList) {
    setBusy(true); setMsg(null);
    let okCount = 0; let lastError = "";
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file); fd.set("alt", alt); fd.set("caption", caption);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      if (res.ok) okCount++; else lastError = (await res.json().catch(() => ({}))).error ?? "Upload failed";
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
    setMsg(lastError ? { ok: false, text: lastError } : { ok: true, text: `${okCount} image${okCount === 1 ? "" : "s"} uploaded and optimised.` });
    if (okCount) { setAlt(""); setCaption(""); router.refresh(); }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Alt text (applied to this upload)" htmlFor="mu-alt" hint="Also used to build a descriptive filename."><input id="mu-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} className={inputCls} /></Field>
      <Field label="Caption / credit" htmlFor="mu-cap"><input id="mu-cap" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} className={inputCls} /></Field>
      <div className="sm:col-span-2">
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}Upload images
        </button>
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" aria-label="Choose image files" onChange={(e) => e.target.files?.length && send(e.target.files)} />
        <p className="mt-2 text-xs text-slate-500">JPEG, PNG, WebP, GIF or AVIF up to 8 MB. Converted to WebP (max 2000px wide) plus a 1200×630 social-sharing version.</p>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
