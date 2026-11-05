"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

export interface PickedMedia {
  id: string; url: string; og_url: string | null; alt_text: string | null; caption: string | null; filename: string; width: number | null; height: number | null;
}

/** Modal to choose an existing image or upload a new one (optimised server-side). */
export function MediaPickerModal({ onPick, onClose }: { onPick: (m: PickedMedia) => void; onClose: () => void }) {
  const [items, setItems] = useState<PickedMedia[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/media?q=${encodeURIComponent(term)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => void load(q), 250); return () => clearTimeout(t); }, [q, load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(file: File) {
    setUploading(true); setError("");
    const fd = new FormData();
    fd.set("file", file); fd.set("alt", alt);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onPick(json.item as PickedMedia);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Media library">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-bold text-slate-900">Media library</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /><span className="sr-only">Close</span></button>
        </div>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mp-search" className="text-xs font-semibold text-slate-700">Search library</label>
            <input id="mp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filename or alt text" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="mp-alt" className="text-xs font-semibold text-slate-700">Upload new image (alt text recommended)</label>
            <div className="mt-1 flex gap-2">
              <input id="mp-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} placeholder="Describe the image" className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />} Upload
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" aria-label="Choose image file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </div>
        </div>
        {error && <p role="alert" className="mx-4 mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">{error}</p>}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No images yet. Upload one above.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onPick(m)} className="group block w-full overflow-hidden rounded border border-slate-200 text-left hover:border-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt_text ?? ""} loading="lazy" className="aspect-[4/3] w-full bg-slate-100 object-cover" />
                    <span className="block truncate px-2 py-1 text-xs text-slate-600">{m.alt_text || m.filename}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Form field: preview + choose/upload + remove. Submits the URL (and media id) as hidden inputs. */
export function ImageField({ name, label, initialUrl, initialId, variant = "main", onPicked, hint }: {
  name: string; label: string; initialUrl?: string | null; initialId?: string | null; variant?: "main" | "og";
  onPicked?: (m: PickedMedia) => void; hint?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [id, setId] = useState(initialId ?? "");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800" id={`${name}-label`}>{label}</p>
      <input type="hidden" name={name} value={url} />
      <input type="hidden" name={`${name.replace(/_url$/, "")}_media_id`} value={id} />
      <div className="mt-1 flex items-start gap-3">
        <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-slate-300 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-500" aria-hidden="true" />}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-label={`${url ? "Change" : "Choose / upload"} ${label.toLowerCase()}`} onClick={() => setOpen(true)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">{url ? "Change" : "Choose / upload"}</button>
            {url && <button type="button" onClick={() => { setUrl(""); setId(""); }} className="rounded px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">Remove</button>}
          </div>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      {open && (
        <MediaPickerModal
          onClose={() => setOpen(false)}
          onPick={(m) => { setUrl(variant === "og" ? m.og_url || m.url : m.url); setId(m.id); setOpen(false); onPicked?.(m); }}
        />
      )}
    </div>
  );
}
