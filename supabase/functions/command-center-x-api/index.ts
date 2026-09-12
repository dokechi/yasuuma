import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import twitterText from "npm:twitter-text@3.1.0";

const SUPA = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(SUPA, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const enc = new TextEncoder();
const ALLOWED = new Set(["https://dokechi.github.io"]);
const STATUSES = new Set(["inbox", "candidate", "draft", "approved", "posted", "rejected"]);
const TYPES = new Set(["opening", "deadline", "affiliate"]);
const VALUE_KINDS = new Set(["official_feature", "listing_price", "sold_price", "scarcity", "other"]);
const FRANCHISES = new Set([
  "pokemon", "onepiece", "yugioh", "duelmasters", "gundam", "dragonball", "lorcana",
  "unionarena", "weiss", "hololive", "digimon", "mtg", "fftcg", "other",
]);
const CATEGORIES = new Set([
  "card_lottery", "card_reservation", "card_stock", "card_bonus", "card_sale",
  "card_giveaway", "card_oripa", "other",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (ALLOWED.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization,content-type");
  return headers;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function auth(req: Request) {
  const raw = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const [expires, signature] = raw.split(".");
  const exp = Number(expires);
  return !!exp && exp >= Date.now() && same(signature || "", await hmac(`retro|${expires}`));
}

function txt(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function oneLine(value: unknown, max: number) {
  const result = String(value || "").replace(/\s+/g, " ").trim();
  const chars = Array.from(result);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : result;
}

function safeUrl(value: unknown) {
  const result = txt(value);
  if (!result) return null;
  try {
    const url = new URL(result);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function date(value: unknown) {
  const result = txt(value);
  if (!result) return null;
  const parsed = new Date(result);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function num(value: unknown, min = 0, max = 100) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(min, Math.min(max, Math.round(result))) : null;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function clean(value: unknown) {
  return String(value || "").normalize("NFKC").toLowerCase()
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/gi, "").slice(0, 180);
}

function fmt(value: unknown) {
  if (!value) return "日時は公式で確認";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.valueOf())) return "日時は公式で確認";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed).replace(" ", " ");
}

function tweetMeta(value: string) {
  const parsed = twitterText.parseTweet(value);
  return { weightedLength: parsed.weightedLength, valid: parsed.valid };
}

function threadLength(value: string) {
  return Array.from(value).length;
}

type DraftParts = {
  product: string;
  shop: string;
  deadline: string;
  condition: string;
  hook: string;
  link: string;
  affiliate: string;
};

function composeX(type: string, p: DraftParts) {
  const optional = [p.hook, p.condition].filter(Boolean).join("\n");
  const facts = optional ? `${optional}\n\n` : "";
  if (type === "deadline") {
    return `これ、もうすぐ締切やん😳\n\n${p.product}\n${p.shop}は${p.deadline}まで。\n${facts}応募はこちら👇\n${p.link}`;
  }
  if (type === "affiliate") {
    return `[PR] ${p.product}\n\n${p.shop}で受付中。\n締切 ${p.deadline}\n${facts}応募はこちら👇\n${p.link}\n\n関連商品👇\n${p.affiliate}`;
  }
  return `これ、受付始まってるやん😳\n\n${p.product}\n${p.shop}で受付中。\n締切 ${p.deadline}\n${facts}応募はこちら👇\n${p.link}`;
}

function composeThreads(type: string, p: DraftParts) {
  const optional = [p.hook, p.condition].filter(Boolean).join("\n");
  const facts = optional ? `${optional}\n\n` : "";
  if (type === "deadline") {
    return `これ、もうすぐ締切やん😳\n\n${p.product}\n${p.shop}の受付は${p.deadline}まで。\n\n${facts}条件に当てはまる方は、忘れる前に確認しておいた方がよさそう。\n\n応募はこちら👇\n${p.link}`;
  }
  if (type === "affiliate") {
    return `[PR]\nこれ、${p.product}の受付始まってるやん😳\n\n${p.shop}で受付中。締切は${p.deadline}。\n\n${facts}応募ページ👇\n${p.link}\n\n関連商品はこちら👇\n${p.affiliate}`;
  }
  return `これ、${p.product}の受付始まってるやん😳\n\n${p.shop}で受付中。締切は${p.deadline}。\n\n${facts}条件に当てはまる方は、忘れる前に確認しておくのがよさそう。\n\n応募はこちら👇\n${p.link}`;
}

function drafts(row: Record<string, unknown>, type: string) {
  const product = String(row.product_name || "").trim();
  const shop = String(row.organizer || "公式ストア").trim();
  const link = String(row.application_url || row.official_url || "").trim();
  const affiliate = String(row.affiliate_url || "").trim();
  if (!product || !link) throw new Error("商品名と応募URLが必要です");
  if (!row.official_verified || !row.official_url) throw new Error("公式確認を済ませてから下書きを作成してください");
  if (type === "affiliate" && !affiliate) throw new Error("PR導線にはアフィリエイトURLが必要です");

  const base: DraftParts = {
    product: oneLine(product, 90),
    shop: oneLine(shop, 42),
    deadline: fmt(row.application_deadline),
    condition: oneLine(row.conditions, 52),
    hook: oneLine(row.value_hook, 54),
    link,
    affiliate,
  };
  let xText = composeX(type, base);
  if (!tweetMeta(xText).valid) xText = composeX(type, { ...base, condition: "" });
  if (!tweetMeta(xText).valid) xText = composeX(type, { ...base, condition: "", hook: "" });
  let productLimit = 72;
  while (!tweetMeta(xText).valid && productLimit >= 18) {
    xText = composeX(type, {
      ...base,
      condition: "",
      hook: "",
      product: oneLine(product, productLimit),
    });
    productLimit -= 6;
  }
  if (!tweetMeta(xText).valid) throw new Error("X投稿文を280文字以内に収められませんでした");

  let threadsText = composeThreads(type, {
    ...base,
    condition: oneLine(row.conditions, 100),
    hook: oneLine(row.value_hook, 90),
  });
  if (threadLength(threadsText) > 500) {
    threadsText = composeThreads(type, { ...base, condition: oneLine(row.conditions, 60), hook: oneLine(row.value_hook, 60) });
  }
  if (threadLength(threadsText) > 500) throw new Error("Threads投稿文を500文字以内に収められませんでした");
  return { xText, threadsText };
}

function isExpired(row: Record<string, unknown>) {
  if (["posted", "rejected"].includes(String(row.status || ""))) return false;
  if (!row.application_deadline) return false;
  const deadline = new Date(String(row.application_deadline)).valueOf();
  return Number.isFinite(deadline) && deadline < Date.now();
}

function map(row: Record<string, any>) {
  const xMeta = tweetMeta(String(row.x_draft || ""));
  return {
    id: row.id,
    candidateKey: row.candidate_key,
    sourceSignalId: row.source_signal_id,
    taskId: row.task_id,
    category: row.category,
    franchise: row.franchise,
    productName: row.product_name,
    organizer: row.organizer,
    status: row.status,
    priority: row.priority,
    score: row.score,
    applicationStart: row.application_start,
    applicationDeadline: row.application_deadline,
    conditions: row.conditions,
    applicationUrl: row.application_url,
    officialUrl: row.official_url,
    discoveryUrl: row.discovery_url,
    targetRegion: row.target_region,
    priceYen: row.price_yen,
    affiliateStatus: row.affiliate_status,
    affiliateUrl: row.affiliate_url,
    affiliateNote: row.affiliate_note,
    draftType: row.draft_type,
    toneProfile: row.tone_profile,
    xDraft: row.x_draft,
    threadsDraft: row.threads_draft,
    xWeightedLength: xMeta.weightedLength,
    xDraftValid: !row.x_draft || xMeta.valid,
    threadsLength: threadLength(String(row.threads_draft || "")),
    valueHook: row.value_hook,
    valueHookKind: row.value_hook_kind,
    valueHookSourceUrl: row.value_hook_source_url,
    valueHookCheckedAt: row.value_hook_checked_at,
    officialVerified: row.official_verified,
    officialCheckedAt: row.official_checked_at,
    officialCheckNote: row.official_check_note,
    discoverySource: row.discovery_source,
    decisionReason: row.decision_reason,
    userNote: row.user_note,
    postedUrl: row.posted_url,
    postedAt: row.posted_at,
    threadsPostedUrl: row.threads_posted_url,
    threadsPostedAt: row.threads_posted_at,
    detectedAt: row.detected_at,
    sourcePayload: row.source_payload || {},
    isExpired: isExpired(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function editable(source: Record<string, any>) {
  const out: Record<string, any> = {};
  const texts: Record<string, string> = {
    productName: "product_name",
    organizer: "organizer",
    conditions: "conditions",
    targetRegion: "target_region",
    affiliateNote: "affiliate_note",
    xDraft: "x_draft",
    threadsDraft: "threads_draft",
    valueHook: "value_hook",
    officialCheckNote: "official_check_note",
    discoverySource: "discovery_source",
    decisionReason: "decision_reason",
    userNote: "user_note",
    toneProfile: "tone_profile",
  };
  for (const [from, to] of Object.entries(texts)) {
    if (Object.prototype.hasOwnProperty.call(source, from)) out[to] = txt(source[from]);
  }
  const urls: Record<string, string> = {
    applicationUrl: "application_url",
    officialUrl: "official_url",
    discoveryUrl: "discovery_url",
    affiliateUrl: "affiliate_url",
    valueHookSourceUrl: "value_hook_source_url",
    postedUrl: "posted_url",
    threadsPostedUrl: "threads_posted_url",
  };
  for (const [from, to] of Object.entries(urls)) {
    if (Object.prototype.hasOwnProperty.call(source, from)) out[to] = safeUrl(source[from]);
  }
  const dates: [string, string][] = [
    ["applicationStart", "application_start"],
    ["applicationDeadline", "application_deadline"],
    ["valueHookCheckedAt", "value_hook_checked_at"],
    ["officialCheckedAt", "official_checked_at"],
    ["postedAt", "posted_at"],
    ["threadsPostedAt", "threads_posted_at"],
  ];
  for (const [from, to] of dates) {
    if (Object.prototype.hasOwnProperty.call(source, from)) out[to] = date(source[from]);
  }
  if (Object.prototype.hasOwnProperty.call(source, "officialVerified")) out.official_verified = !!source.officialVerified;
  if (Object.prototype.hasOwnProperty.call(source, "score")) out.score = num(source.score);
  if (Object.prototype.hasOwnProperty.call(source, "priceYen")) out.price_yen = num(source.priceYen, 0, 100000000);
  if (Object.prototype.hasOwnProperty.call(source, "priority") && ["S", "A", "B", "C"].includes(source.priority)) out.priority = source.priority;
  if (Object.prototype.hasOwnProperty.call(source, "status") && STATUSES.has(source.status)) out.status = source.status;
  if (Object.prototype.hasOwnProperty.call(source, "draftType") && TYPES.has(source.draftType)) out.draft_type = source.draftType;
  if (Object.prototype.hasOwnProperty.call(source, "affiliateStatus") && ["available", "none", "check"].includes(source.affiliateStatus)) out.affiliate_status = source.affiliateStatus;
  if (Object.prototype.hasOwnProperty.call(source, "valueHookKind")) out.value_hook_kind = VALUE_KINDS.has(source.valueHookKind) ? source.valueHookKind : null;
  if (Object.prototype.hasOwnProperty.call(source, "franchise") && FRANCHISES.has(source.franchise)) out.franchise = source.franchise;
  if (Object.prototype.hasOwnProperty.call(source, "category") && CATEGORIES.has(source.category)) out.category = source.category;
  return out;
}

function validateDrafts(source: Record<string, any>) {
  if (Object.prototype.hasOwnProperty.call(source, "xDraft") && source.xDraft) {
    const meta = tweetMeta(String(source.xDraft));
    if (!meta.valid) throw new Error(`X投稿文が上限を超えています（${meta.weightedLength}/280）`);
  }
  if (Object.prototype.hasOwnProperty.call(source, "threadsDraft") && source.threadsDraft) {
    const length = threadLength(String(source.threadsDraft));
    if (length > 500) throw new Error(`Threads投稿文が上限を超えています（${length}/500）`);
  }
}

async function row(id: string) {
  const { data, error } = await db.from("command_center_x_candidates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("candidate_not_found");
  return data;
}

async function recordDraftReviews(current: Record<string, any>, source: Record<string, any>, reason: unknown) {
  const rows = [];
  if (Object.prototype.hasOwnProperty.call(source, "xDraft") && String(source.xDraft || "") !== String(current.x_draft || "")) {
    rows.push({ candidate_id: current.id, platform: "x", before_text: current.x_draft, after_text: String(source.xDraft || ""), reason: txt(reason) });
  }
  if (Object.prototype.hasOwnProperty.call(source, "threadsDraft") && String(source.threadsDraft || "") !== String(current.threads_draft || "")) {
    rows.push({ candidate_id: current.id, platform: "threads", before_text: current.threads_draft, after_text: String(source.threadsDraft || ""), reason: txt(reason) });
  }
  if (!rows.length) return null;
  const { error } = await db.from("command_center_card_draft_reviews").insert(rows);
  return error ? error.message : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (!(await auth(req))) return json(req, { ok: false, error: "unauthorized" }, 401);
  try {
    if (req.method === "GET") {
      const { data, error } = await db.from("command_center_x_candidates").select("*")
        .order("updated_at", { ascending: false })
        .order("detected_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("score", { ascending: false })
        .limit(400);
      if (error) throw error;
      const items = (data || []).map(map);
      const counts: Record<string, number> = { total: items.length, inbox: 0, candidate: 0, draft: 0, approved: 0, expired: 0, posted: 0, rejected: 0 };
      for (const item of items) counts[item.isExpired ? "expired" : item.status] = (counts[item.isExpired ? "expired" : item.status] || 0) + 1;
      return json(req, { ok: true, items, counts, generatedAt: new Date().toISOString() });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const source = body.candidate || body;
      validateDrafts(source);
      const product = txt(source.productName);
      if (!product) return json(req, { ok: false, error: "product_name_required" }, 400);
      const organizer = txt(source.organizer) || "";
      const deadline = date(source.applicationDeadline) || "";
      const candidateKey = txt(source.candidateKey) || `manual:${(await digest(`${clean(product)}|${clean(organizer)}|${deadline}`)).slice(0, 32)}`;
      const base = {
        candidate_key: candidateKey,
        product_name: product,
        organizer,
        status: "inbox",
        priority: "B",
        score: 0,
        category: "card_lottery",
        franchise: "other",
        source_payload: { via: "manual" },
      };
      const value = { ...base, ...editable(source) };
      if (value.official_verified && !value.official_checked_at) value.official_checked_at = new Date().toISOString();
      const { data, error } = await db.from("command_center_x_candidates").upsert(value, { onConflict: "candidate_key" }).select("*").single();
      if (error) throw error;
      return json(req, { ok: true, item: map(data) });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || "");
      if (!id) return json(req, { ok: false, error: "id_required" }, 400);
      const current = await row(id);
      const action = String(body.action || "save");

      if (action === "generate") {
        const type = TYPES.has(String(body.draftType)) ? String(body.draftType) : "opening";
        const generated = drafts(current, type);
        const { data, error } = await db.from("command_center_x_candidates").update({
          x_draft: generated.xText,
          threads_draft: generated.threadsText,
          draft_type: type,
          status: "draft",
        }).eq("id", id).select("*").single();
        if (error) throw error;
        return json(req, { ok: true, item: map(data) });
      }

      if (action === "status") {
        const status = String(body.status || "");
        if (!STATUSES.has(status)) return json(req, { ok: false, error: "invalid_status" }, 400);
        if (status === "approved" && (!current.official_verified || !current.x_draft || !current.threads_draft)) {
          return json(req, { ok: false, error: "公式確認とX・Threads両方の下書きが必要です" }, 400);
        }
        const update: Record<string, any> = { status };
        if (status === "rejected" && body.decisionReason !== undefined) update.decision_reason = txt(body.decisionReason);
        const { data, error } = await db.from("command_center_x_candidates").update(update).eq("id", id).select("*").single();
        if (error) throw error;
        return json(req, { ok: true, item: map(data) });
      }

      if (action === "publish") {
        const platform = String(body.platform || "");
        if (!["x", "threads"].includes(platform)) return json(req, { ok: false, error: "invalid_platform" }, 400);
        const update: Record<string, any> = {};
        const at = new Date().toISOString();
        if (platform === "x") {
          update.posted_at = at;
          if (body.postedUrl !== undefined) update.posted_url = safeUrl(body.postedUrl);
        } else {
          update.threads_posted_at = at;
          if (body.postedUrl !== undefined) update.threads_posted_url = safeUrl(body.postedUrl);
        }
        const xDone = platform === "x" || !!current.posted_at;
        const threadsDone = platform === "threads" || !!current.threads_posted_at;
        update.status = (!current.x_draft || xDone) && (!current.threads_draft || threadsDone) ? "posted" : "approved";
        const { data, error } = await db.from("command_center_x_candidates").update(update).eq("id", id).select("*").single();
        if (error) throw error;
        return json(req, { ok: true, item: map(data) });
      }

      const source = body.candidate || body;
      validateDrafts(source);
      const update = editable(source);
      if (update.official_verified && !update.official_checked_at && !current.official_checked_at) {
        update.official_checked_at = new Date().toISOString();
      }
      const { data, error } = await db.from("command_center_x_candidates").update(update).eq("id", id).select("*").single();
      if (error) throw error;
      const reviewWarning = await recordDraftReviews(current, source, body.editReason);
      return json(req, { ok: true, item: map(data), reviewWarning });
    }

    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const { error } = await db.from("command_center_x_candidates").delete().eq("id", String(body.id || ""));
      if (error) throw error;
      return json(req, { ok: true });
    }
    return json(req, { ok: false, error: "method_not_allowed" }, 405);
  } catch (error) {
    return json(req, { ok: false, error: String((error as any)?.message || error) }, 500);
  }
});
