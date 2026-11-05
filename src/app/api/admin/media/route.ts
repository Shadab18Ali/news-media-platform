import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getStaff } from "@/lib/admin/auth";
import { detectImageType, buildStoragePath, MAX_UPLOAD_BYTES } from "@/lib/media";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getStaff();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80).replace(/[%_,()]/g, " ");
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);
  let query = ctx.supabase.from("media").select("id,url,og_url,filename,alt_text,caption,width,height,size_bytes,created_at").order("created_at", { ascending: false }).range(offset, offset + 59);
  if (q) query = query.or(`filename.ilike.%${q}%,alt_text.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load media" }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getStaff();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`upload:${ctx.user.id}`, 40, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads. Slow down." }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `File must be between 1 byte and ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` }, { status: 413 });

  const input = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageType(input);
  if (!kind) return NextResponse.json({ error: "Unsupported file. Upload a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 415 });

  const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 500);

  let main: Buffer, og: Buffer, width: number | undefined, height: number | undefined;
  try {
    const base = sharp(input, { limitInputPixels: 60_000_000, animated: kind === "gif" }).rotate();
    const out = await base.clone().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    main = out.data; width = out.info.width; height = out.info.height;
    // Social-sharing variant: 1200x630 (1.91:1), the size Facebook/X/LinkedIn expect.
    og = await sharp(input, { limitInputPixels: 60_000_000 }).rotate().resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return NextResponse.json({ error: "That image could not be processed. It may be corrupt." }, { status: 422 });
  }

  const { path, filename } = buildStoragePath(alt || file.name);
  const ogPath = path.replace(/\.webp$/, "-og.jpg");
  const bucket = ctx.supabase.storage.from("media");
  const cache = "31536000";

  const up1 = await bucket.upload(path, main, { contentType: "image/webp", cacheControl: cache, upsert: false });
  if (up1.error) return NextResponse.json({ error: "Storage upload failed. Check the media bucket and your permissions." }, { status: 502 });
  const up2 = await bucket.upload(ogPath, og, { contentType: "image/jpeg", cacheControl: cache, upsert: false });

  const url = bucket.getPublicUrl(path).data.publicUrl;
  const ogUrl = up2.error ? null : bucket.getPublicUrl(ogPath).data.publicUrl;

  const { data, error } = await ctx.supabase.from("media").insert({
    storage_path: path, url, og_url: ogUrl, filename, alt_text: alt || null, caption: caption || null,
    mime_type: "image/webp", size_bytes: main.length, width, height, uploaded_by: ctx.user.id,
  }).select("id,url,og_url,filename,alt_text,caption,width,height,size_bytes,created_at").single();

  if (error) {
    await bucket.remove([path, ogPath]);
    return NextResponse.json({ error: "Could not save media record" }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
}
