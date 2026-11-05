// Local TEST gateway that speaks the subset of Supabase's REST/Auth/Storage APIs that this app uses,
// backed by a real PostgreSQL server (so SQL, constraints and Row Level Security are real).
// It is NOT PostgREST/GoTrue and is only for offline end-to-end tests. See tests/e2e/README.md.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const SECRET = process.env.JWT_SECRET ?? "test-only-jwt-secret-test-only-jwt-secret";
const DB = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/postgres";
const STORE = process.env.STORAGE_DIR ?? "/tmp/e2e-storage";
fs.mkdirSync(STORE, { recursive: true });
const pool = new pg.Pool({ connectionString: DB, max: 8 });
pool.on("error", (e) => console.error("pool error (ignored):", e.message));

// ---------- JWT (HS256) ----------
const b64 = (b) => Buffer.from(b).toString("base64url");
export function sign(payload) {
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify(payload));
  const s = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
function verify(token) {
  const [h, p, s] = (token ?? "").split(".");
  if (!h || !p || !s) return null;
  const good = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  if (good.length !== s.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(s))) return null;
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (claims.exp && claims.exp < Date.now() / 1000) return null;
  return claims;
}
const ANON = sign({ role: "anon", iss: "supabase", exp: 4102444800 });
const SERVICE = sign({ role: "service_role", iss: "supabase", exp: 4102444800 });
if (process.argv.includes("--keys")) { console.log(JSON.stringify({ ANON, SERVICE })); process.exit(0); }

// ---------- helpers ----------
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw httpErr(400, "PGRST100", `bad identifier ${s}`); return `"${s}"`; };
const httpErr = (status, code, message, details) => Object.assign(new Error(message), { status, code, details });
const read = (req) => new Promise((res) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => res(Buffer.concat(c))); });
const send = (res, status, body, headers = {}) => {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { "Content-Type": isBuf ? "application/octet-stream" : "application/json", ...headers });
  res.end(body === undefined ? undefined : isBuf ? body : JSON.stringify(body));
};

const FK = { // many-to-one embeds: table -> embedded table -> local column
  articles: { categories: "category_id", authors: "author_id", media: "featured_image_id" },
  article_tags: { tags: "tag_id", articles: "article_id" },
};

// select=a,b,alias:table(cols),table(cols),*
function splitTop(s) { const out = []; let d = 0, cur = ""; for (const ch of s) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; }
function selectSql(table, sel) {
  if (!sel || sel === "*") return `${ident(table)}.*`;
  return splitTop(sel).map((part) => {
    part = part.trim();
    const m = /^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)\((.*)\)$/is.exec(part);
    if (m) {
      const [, alias, rel, inner] = m;
      const col = FK[table]?.[rel];
      if (!col) throw httpErr(400, "PGRST200", `no relationship ${table} -> ${rel}`);
      const innerSel = inner === "*" ? "*" : inner.split(",").map((c) => ident(c.trim())).join(",");
      return `(select to_jsonb(_e) from (select ${innerSel} from ${ident(rel)} _r where _r.id = ${ident(table)}.${ident(col)}) _e) as ${ident(alias ?? rel)}`;
    }
    if (part === "*") return `${ident(table)}.*`;
    return `${ident(table)}.${ident(part)}`;
  }).join(", ");
}

const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };
function cond(col, spec, params, neg = false) {
  const dot = spec.indexOf(".");
  let op = spec.slice(0, dot), val = spec.slice(dot + 1);
  if (op === "not") return cond(col, val, params, !neg);
  const c = ident(col);
  let sql;
  if (OPS[op]) { params.push(val); sql = `${c} ${OPS[op]} $${params.length}`; }
  else if (op === "in") {
    const items = [...val.replace(/^\(|\)$/g, "").matchAll(/"([^"]*)"|([^,]+)/g)].map((m) => m[1] ?? m[2]);
    params.push(items); sql = `${c}::text = any($${params.length}::text[])`;
  } else if (op === "is") sql = `${c} is ${val === "null" ? "null" : val === "true" ? "true" : "false"}`;
  else if (/^(fts|plfts|phfts|wfts)/.test(op)) {
    const cfg = /\((\w+)\)/.exec(op)?.[1] ?? "english";
    const fn = { fts: "to_tsquery", plfts: "plainto_tsquery", phfts: "phraseto_tsquery", wfts: "websearch_to_tsquery" }[op.replace(/\(.*/, "")];
    params.push(val); sql = `${c} @@ ${fn}('${cfg.replace(/\W/g, "")}', $${params.length})`;
  } else throw httpErr(400, "PGRST100", `unsupported operator ${op}`);
  return neg ? `not (${sql})` : sql;
}
function where(table, q, params) {
  const parts = [];
  for (const [k, v] of q.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (k === "or" || k === "and") {
      const inner = splitTop(v.replace(/^\(|\)$/g, "")).map((p) => { const m = /^([a-z_][a-z0-9_]*)\.(.*)$/i.exec(p); return cond(m[1], m[2], params); });
      parts.push(`(${inner.join(k === "or" ? " or " : " and ")})`);
    } else parts.push(cond(k, v, params));
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

async function withRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = ["anon", "authenticated", "service_role"].includes(claims.role) ? claims.role : "anon";
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [JSON.stringify(claims), claims.sub ?? ""]);
    const r = await fn(client);
    await client.query("commit");
    return r;
  } catch (e) { await client.query("rollback").catch(() => {}); throw e; } finally { client.release(); }
}
const jsonParam = (v) => (v !== null && typeof v === "object" ? { json: JSON.stringify(v) } : null);
function bind(params, v) { const j = jsonParam(v); params.push(j ? j.json : v); return j ? `$${params.length}::jsonb` : `$${params.length}`; }

async function rest(req, res, url, claims) {
  const [, , , name, rest2] = url.pathname.split("/");
  const prefer = req.headers.prefer ?? "";
  const wantObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const q = url.searchParams;

  if (name === "rpc") {
    const args = JSON.parse((await read(req)).toString() || "{}");
    const fn = ident(rest2);
    const keys = Object.keys(args);
    const params = keys.map((k) => args[k]);
    const sql = `select * from public.${fn}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(",")})`;
    const out = await withRole(claims, (c) => c.query(sql, params));
    return send(res, 200, out.rows.length === 1 && Object.keys(out.rows[0]).length === 1 && !("id" in out.rows[0]) ? out.rows[0][Object.keys(out.rows[0])[0]] : out.rows);
  }

  const table = name; ident(table);
  const method = req.method;
  const params = [];
  if (method === "GET" || method === "HEAD") {
    const w = where(table, q, params);
    const order = q.get("order") ? " order by " + q.get("order").split(",").map((o) => { const [c, d = "asc", n] = o.split("."); return `${ident(c)} ${d === "desc" ? "desc" : "asc"}${n ? ` nulls ${n === "nullsfirst" ? "first" : "last"}` : ""}`; }).join(", ") : "";
    const range = req.headers.range?.match(/(\d+)-(\d+)/);
    const limit = q.get("limit") ?? (range ? Number(range[2]) - Number(range[1]) + 1 : null);
    const offset = q.get("offset") ?? (range ? range[1] : null);
    const page = `${limit ? ` limit ${Number(limit)}` : ""}${offset ? ` offset ${Number(offset)}` : ""}`;
    const sel = selectSql(table, q.get("select"));
    const out = await withRole(claims, async (c) => {
      const rows = await c.query(`select coalesce(json_agg(_t), '[]'::json) as j from (select ${sel} from ${ident(table)}${w}${order}${page}) _t`, params);
      let total = null;
      if (/count=exact/.test(prefer)) total = Number((await c.query(`select count(*)::int as n from ${ident(table)}${w}`, params)).rows[0].n);
      return { rows: rows.rows[0].j, total };
    });
    const headers = {};
    if (out.total !== null) headers["Content-Range"] = `${out.rows.length ? `${offset ?? 0}-${Number(offset ?? 0) + out.rows.length - 1}` : "*"}/${out.total}`;
    if (method === "HEAD") return send(res, 200, undefined, headers);
    if (wantObject) {
      if (out.rows.length !== 1) throw httpErr(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${out.rows.length} rows`);
      return send(res, 200, out.rows[0], headers);
    }
    return send(res, 200, out.rows, headers);
  }

  if (method === "POST") {
    let body = JSON.parse((await read(req)).toString() || "{}");
    const rows = Array.isArray(body) ? body : [body];
    if (!rows.length) return send(res, 201, []);
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const valuesSql = rows.map((r) => `(${cols.map((c) => (c in r ? bind(params, r[c]) : "default")).join(",")})`).join(",");
    let conflict = "";
    if (/resolution=/.test(prefer)) {
      const target = (q.get("on_conflict") ?? "id").split(",").map(ident).join(",");
      conflict = /ignore-duplicates/.test(prefer) ? ` on conflict (${target}) do nothing` : ` on conflict (${target}) do update set ${cols.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(",")}`;
    }
    const sql = `insert into ${ident(table)} (${cols.map(ident).join(",")}) values ${valuesSql}${conflict} returning ${selectSql(table, q.get("select"))}`;
    const out = await withRole(claims, (c) => c.query(sql, params));
    if (!/return=representation/.test(prefer)) return send(res, 201, undefined);
    if (wantObject) return send(res, 201, out.rows[0]);
    return send(res, 201, out.rows);
  }

  if (method === "PATCH") {
    const body = JSON.parse((await read(req)).toString());
    const sets = Object.keys(body).map((k) => `${ident(k)} = ${bind(params, body[k])}`).join(",");
    const w = where(table, q, params);
    const out = await withRole(claims, (c) => c.query(`update ${ident(table)} set ${sets}${w} returning ${selectSql(table, q.get("select"))}`, params));
    if (!/return=representation/.test(prefer)) return send(res, 204, undefined);
    if (wantObject) { if (out.rows.length !== 1) throw httpErr(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${out.rows.length} rows`); return send(res, 200, out.rows[0]); }
    return send(res, 200, out.rows);
  }

  if (method === "DELETE") {
    const w = where(table, q, params);
    const out = await withRole(claims, (c) => c.query(`delete from ${ident(table)}${w} returning ${selectSql(table, q.get("select"))}`, params));
    return /return=representation/.test(prefer) ? send(res, 200, out.rows) : send(res, 204, undefined);
  }
  throw httpErr(405, "PGRST000", "method not allowed");
}

// ---------- Auth (GoTrue subset) ----------
async function auth(req, res, url) {
  const sub = url.pathname.replace("/auth/v1/", "");
  const userJson = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
  const session = (u) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return { access_token: sign({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: sign({ sub: u.id, kind: "refresh", exp: exp + 86400 * 30 }), user: userJson(u) };
  };
  if (sub === "token") {
    const grant = url.searchParams.get("grant_type");
    const body = JSON.parse((await read(req)).toString() || "{}");
    if (grant === "password") {
      const r = await pool.query("select id, email from auth.users where email = $1 and encrypted_password = crypt($2, encrypted_password)", [body.email, body.password]);
      if (!r.rows[0]) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return send(res, 200, session(r.rows[0]));
    }
    if (grant === "refresh_token") {
      const c = verify(body.refresh_token);
      if (!c) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      const r = await pool.query("select id, email from auth.users where id = $1", [c.sub]);
      return send(res, 200, session(r.rows[0]));
    }
  }
  if (sub === "user") {
    const c = verify((req.headers.authorization ?? "").replace(/^Bearer /, ""));
    if (!c?.sub) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    const r = await pool.query("select id, email from auth.users where id = $1", [c.sub]);
    if (!r.rows[0]) return send(res, 401, { code: 401, msg: "user not found" });
    return send(res, 200, userJson(r.rows[0]));
  }
  if (sub === "logout") return send(res, 204, undefined);
  return send(res, 404, { msg: "not found" });
}

// ---------- Storage subset ----------
async function storage(req, res, url, claims) {
  const rel = decodeURIComponent(url.pathname.replace("/storage/v1/", ""));
  if (req.method === "GET" && rel.startsWith("object/public/")) {
    const file = path.join(STORE, rel.replace("object/public/", ""));
    if (!file.startsWith(STORE) || !fs.existsSync(file)) return send(res, 404, { error: "not_found" });
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": ext === ".webp" ? "image/webp" : ext === ".jpg" ? "image/jpeg" : "application/octet-stream", "Cache-Control": "public, max-age=3600" });
    return res.end(fs.readFileSync(file));
  }
  // Writes require a staff user, mirroring the storage RLS policies.
  const isStaff = claims.role === "service_role" || (claims.sub && (await pool.query("select role from public.profiles where id = $1", [claims.sub])).rows[0]?.role !== "reader" && (await pool.query("select 1 from public.profiles where id = $1", [claims.sub])).rows.length > 0);
  if (!isStaff) return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
  if ((req.method === "POST" || req.method === "PUT") && rel.startsWith("object/")) {
    const file = path.join(STORE, rel.replace("object/", ""));
    if (!file.startsWith(STORE)) return send(res, 400, { error: "bad path" });
    if (fs.existsSync(file) && req.headers["x-upsert"] !== "true") return send(res, 400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let body = await read(req);
    const ct = req.headers["content-type"] ?? "";
    if (ct.startsWith("multipart/form-data")) { // supabase-js sends FormData for Blob/File bodies
      const boundary = ct.split("boundary=")[1];
      const text = body.toString("latin1");
      const start = text.indexOf("\r\n\r\n", text.indexOf(boundary)) + 4;
      const end = text.lastIndexOf(`\r\n--${boundary}`);
      body = Buffer.from(text.slice(start, end), "latin1");
    }
    fs.writeFileSync(file, body);
    return send(res, 200, { Key: rel.replace("object/", ""), Id: crypto.randomUUID() });
  }
  if (req.method === "DELETE" && rel.startsWith("object/")) {
    const bucket = rel.replace("object/", "").split("/")[0];
    const { prefixes = [] } = JSON.parse((await read(req)).toString() || "{}");
    for (const p of prefixes) fs.rmSync(path.join(STORE, bucket, p), { force: true });
    return send(res, 200, prefixes.map((name) => ({ name })));
  }
  return send(res, 404, { error: "not found" });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    const claims = verify(bearer) ?? verify(req.headers.apikey ?? "") ?? { role: "anon" };
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url, claims);
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url);
    if (url.pathname.startsWith("/storage/v1/")) return await storage(req, res, url, claims);
    send(res, 404, { error: "not found" });
  } catch (e) {
    const pgStatus = { 23505: 409, 23503: 409, 23514: 400, 23502: 400, 42501: 403, "22P02": 400 };
    const status = e.status ?? pgStatus[e.code] ?? 400;
    send(res, status, { code: e.code ?? "PGRST000", message: e.message, details: e.details ?? null, hint: null });
  }
}).listen(PORT, () => console.log(`gateway listening on ${PORT}`));
