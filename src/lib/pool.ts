import { supabase, supabaseConfigured } from "./supabase";
import { visitorId } from "./visitor";

export type HeldCode = { code: string; usesLeft: number; handedAt: string };
export type RecentHandout = { code: string; handedAt: string; usesLeft: number };
export type PoolCode = { code: string; usesLeft: number; handedAt: string | null };

export type PoolSnapshot = {
  codes: PoolCode[];
  rotation: number;
  confirmed: number;
  recent: RecentHandout[];
  held: HeldCode | null;
  cooldownUntil: string | null;
};

export type Result =
  | { ok: true; snapshot: PoolSnapshot; notice?: NoticeKey }
  | { ok: false; error: NoticeKey | "network"; snapshot: PoolSnapshot };

export type NoticeKey =
  | "added" | "revived" | "duplicate" | "invalid" | "empty"
  | "cooldown" | "rate" | "noCode" | "workedOk" | "exhaustedOk";

export const emptySnapshot: PoolSnapshot = {
  codes: [],
  rotation: 0,
  confirmed: 0,
  recent: [],
  held: null,
  cooldownUntil: null,
};

const COOLDOWN_MS = 90_000;
const HOUR_LIMIT = 10;
const ADD_DAY_LIMIT = 8;
const GRID_SIZE = 12; // slots shown before we start trimming to the newest batch

const iso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();

function requireDb() {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/** Snapshot: newest codes for the grid, counts, recent handouts, my held code. */
export async function getPool(): Promise<PoolSnapshot> {
  const db = requireDb();
  const visitor = visitorId();

  const [codesQ, recentQ, handoutQ, confirmedQ, hourQ, lastQ] = await Promise.all([
    db.from("codes").select("code, uses_left, last_handed_at, exhausted")
      .eq("exhausted", false).gt("uses_left", 0)
      .order("last_handed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(GRID_SIZE),
    db.from("handouts").select("handed_at, outcome, codes(code, uses_left)")
      .order("handed_at", { ascending: false }).limit(12),
    db.from("handouts").select("handed_at, outcome, codes(code, uses_left)")
      .eq("visitor_hash", visitor).is("outcome", null)
      .order("handed_at", { ascending: false }).limit(1),
    db.from("codes").select("confirmed_count"),
    db.from("handouts").select("handed_at")
      .eq("visitor_hash", visitor)
      .gt("handed_at", new Date(Date.now() - 3_600_000).toISOString()),
    db.from("handouts").select("handed_at")
      .eq("visitor_hash", visitor).not("outcome", "is", null)
      .order("handed_at", { ascending: false }).limit(1),
  ]);

  let cooldownUntil: string | null = null;
  const last = lastQ.data?.[0];
  if (last && !handoutQ.data?.length) {
    const until = new Date(last.handed_at).getTime() + COOLDOWN_MS;
    if (until > Date.now()) cooldownUntil = new Date(until).toISOString();
  }

  return {
    codes: (codesQ.data ?? []).map((r: any) => ({
      code: r.code,
      usesLeft: r.uses_left,
      handedAt: r.last_handed_at ? iso(r.last_handed_at) : null,
    })),
    rotation: codesQ.data?.length ?? 0,
    confirmed: (confirmedQ.data ?? []).reduce((s: number, r: any) => s + (r.confirmed_count ?? 0), 0),
    recent: (recentQ.data ?? [])
      .filter((r: any) => r.codes)
      .map((r: any) => ({
        code: r.codes.code,
        handedAt: iso(r.handed_at),
        usesLeft: r.codes.uses_left,
      })),
    held: handoutQ.data?.[0]?.codes
      ? {
          code: (handoutQ.data[0].codes as any).code,
          usesLeft: (handoutQ.data[0].codes as any).uses_left,
          handedAt: iso(handoutQ.data[0].handed_at),
        }
      : null,
    cooldownUntil,
  } as PoolSnapshot & { _hourCount?: number };
}

export async function takeCode(snap: PoolSnapshot): Promise<Result> {
  const db = requireDb();
  const visitor = visitorId();
  const hourCount = (snap as any)._hourCount ?? 0;
  if (hourCount >= HOUR_LIMIT) return { ok: false, error: "rate", snapshot: snap };
  if (snap.held) return { ok: true, snapshot: snap };
  if (snap.cooldownUntil && new Date(snap.cooldownUntil).getTime() > Date.now()) {
    return { ok: false, error: "cooldown", snapshot: snap };
  }

  const { data, error } = await db.rpc("take_next_code", { p_visitor: visitor });
  if (error) return { ok: false, error: "network", snapshot: snap };
  if (!data?.length) return { ok: false, error: "empty", snapshot: await getPool() };

  const taken = data[0];
  const fresh = await getPool();
  return { ok: true, snapshot: fresh };
}

export async function reportCode(
  outcome: "worked" | "exhausted",
  snap: PoolSnapshot,
): Promise<Result> {
  const db = requireDb();
  const visitor = visitorId();
  const { data: heldRows, error } = await db
    .from("handouts")
    .select("id, code_id")
    .eq("visitor_hash", visitor)
    .is("outcome", null)
    .order("handed_at", { ascending: false })
    .limit(1);
  if (error) return { ok: false, error: "network", snapshot: snap };
  if (!heldRows?.length) return { ok: false, error: "noCode", snapshot: snap };

  const held = heldRows[0];
  await db.from("handouts").update({ outcome }).eq("id", held.id);

  if (outcome === "exhausted") {
    await db.from("codes").update({ exhausted: true, uses_left: 0 }).eq("id", held.code_id);
    return { ok: true, notice: "exhaustedOk", snapshot: await getPool() };
  }
  const { data: c } = await db
    .from("codes").select("confirmed_count").eq("id", held.code_id).single();
  await db
    .from("codes")
    .update({ confirmed_count: (c?.confirmed_count ?? 0) + 1 })
    .eq("id", held.code_id);
  return { ok: true, notice: "workedOk", snapshot: await getPool() };
}

export async function addCode(rawCode: string, snap: PoolSnapshot): Promise<Result> {
  const db = requireDb();
  const visitor = visitorId();
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4 || code.length > 8) {
    return { ok: false, error: "invalid", snapshot: snap };
  }

  const { data, error } = await db.rpc("add_pool_code", {
    p_code: code,
    p_visitor: visitor,
  });
  if (error) return { ok: false, error: "network", snapshot: snap };
  const status: string = data?.[0]?.status ?? "added";
  const notice: NoticeKey =
    status === "duplicate" ? "duplicate" : status === "revived" ? "revived" : "added";
  return { ok: true, notice, snapshot: await getPool() };
}
