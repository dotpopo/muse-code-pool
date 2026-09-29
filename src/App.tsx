import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addCode,
  emptySnapshot,
  getPool,
  reportCode,
  takeCode,
  type PoolSnapshot,
  type Result,
} from "./lib/pool";
import { dict, type Lang } from "./lib/i18n";
import { supabaseConfigured } from "./lib/supabase";

const GRID_SIZE = 12; // full batch shown once the pool fills up
const LANG_KEY = "pool_lang";

function detectLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "zh") return saved;
  return "en"; // default English, switchable to Chinese
}

export default function App() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const t = dict[lang];
  const [snapshot, setSnapshot] = useState<PoolSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    getPool()
      .then(setSnapshot)
      .catch((e) => setToast({ ok: false, text: String(e.message ?? e) }))
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback(
    (r: Result) => {
      const key = r.ok
          ? (r as { notice?: string }).notice
          : r.error;
        setToast({
          ok: r.ok,
          text: key && key !== "network" ? t.notices[key as keyof typeof t.notices] : (lang === "zh" ? "网络错误，请重试。" : "Network error, try again."),
        });
      setSnapshot(r.snapshot);
    },
    [t, lang],
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const act = async (fn: (snap: PoolSnapshot) => Promise<Result>) => {
    setBusy(true);
    try {
      showToast(await fn(snapshot));
    } catch (e: any) {
      setToast({ ok: false, text: String(e.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  /** Grid logic:
   *  - fewer codes than GRID_SIZE -> show all + empty placeholder slots
   *  - once full, trim to the newest batch only (newest first) */
  const gridCodes = useMemo(() => {
    const codes = snapshot.codes.slice(0, Math.max(snapshot.codes.length, 0));
    if (codes.length < GRID_SIZE) return { codes, slots: GRID_SIZE - codes.length, full: false };
    return { codes: codes.slice(0, GRID_SIZE), slots: 0, full: true };
  }, [snapshot.codes]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 pb-16 pt-5">
      <header className="flex items-center justify-between gap-4">
        <span className="text-xl font-semibold">Muse Pool</span>
        <div className="flex items-center gap-2 text-sm">
          {(["en", "zh"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={
                "rounded-md px-2.5 py-1 transition " +
                (lang === l
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300")
              }
            >
              {l === "en" ? "EN" : "中文"}
            </button>
          ))}
        </div>
      </header>

      {!supabaseConfigured && (
        <p className="mt-4 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">
          {lang === "zh"
            ? "尚未配置 Supabase：请在环境变量中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY（见 supabase/ 目录的 SQL）。"
            : "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see the SQL files in supabase/)."}
        </p>
      )}

      <main className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          {t.tagline}
        </p>
        <h1 className="mt-2 whitespace-pre-line text-4xl font-semibold leading-tight">
          {t.title}
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-neutral-600">{t.subtitle}</p>

        <p className="mt-4 text-sm text-neutral-500 tabular-nums">
          <b className="text-neutral-900">{snapshot.rotation}</b> {t.inRotation}
          <span className="mx-2">·</span>
          <b className="text-neutral-900">{snapshot.confirmed}</b> {t.confirmed}
        </p>

        {/* Held code */}
        {snapshot.held ? (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {t.yourCode}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-3xl tracking-[0.2em]">
                {snapshot.held.code}
              </span>
              <button
                onClick={() => copy(snapshot.held!.code)}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {t.redeemHint(snapshot.held.usesLeft)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => act((s) => reportCode("worked", s))}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t.worked}
              </button>
              <button
                disabled={busy}
                onClick={() => act((s) => reportCode("exhausted", s))}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
              >
                {t.exhausted}
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-6">
            <button
              disabled={busy || loading || snapshot.rotation === 0}
              onClick={() => act((s) => takeCode(s))}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {snapshot.rotation === 0 ? t.poolEmpty : t.getCode}
            </button>
            <p className="mt-2 text-sm text-neutral-500">{t.handoutHint}</p>
          </div>
        )}

        {/* Add form */}
        <AddForm lang={lang} pending={busy} onAdd={(code) => act((s) => addCode(code, s))} />

        {/* Newest codes grid with empty placeholder slots */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t.newest}</h2>
          {gridCodes.slots > 0 && (
            <p className="mt-1 text-xs text-neutral-400">{t.emptySlots}</p>
          )}
          <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gridCodes.codes.map((c) => (
              <li
                key={c.code}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-center shadow-sm"
              >
                <p className="font-mono text-base tracking-[0.15em]">{c.code}</p>
                <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                  ~{c.usesLeft} left
                </p>
              </li>
            ))}
            {Array.from({ length: gridCodes.slots }).map((_, i) => (
              <li
                key={`slot-${i}`}
                aria-hidden
                className="flex min-h-[68px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-100/60"
              >
                <span className="text-xs text-neutral-300">+ add</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Recently handed out */}
        {snapshot.recent.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{t.recent}</h2>
              <span className="text-xs text-neutral-400">{t.latest(snapshot.recent.length)}</span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {snapshot.recent.map((r, i) => (
                <li
                  key={`${r.code}-${r.handedAt}-${i}`}
                  className="rounded-lg bg-neutral-100 px-3 py-3"
                >
                  <p className="font-mono text-sm tracking-[0.12em]">{r.code}</p>
                  <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                    ~{r.usesLeft} left
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12 max-w-2xl">
          <h2 className="text-lg font-semibold">{t.faq}</h2>
          <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {t.faqItems.map((item) => (
              <details key={item.q} className="group px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-12 text-xs text-neutral-400">{t.footer}</footer>
      </main>

      {toast && (
        <div
          className={
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white shadow-lg " +
            (toast.ok ? "bg-neutral-900" : "bg-red-600")
          }
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function AddForm({
  lang,
  pending,
  onAdd,
}: {
  lang: Lang;
  pending: boolean;
  onAdd: (code: string) => void;
}) {
  const t = dict[lang];
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        const code = value.trim();
        if (!code) return;
        onAdd(code);
        setValue("");
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder={t.addPlaceholder}
        maxLength={8}
        spellCheck={false}
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 font-mono tracking-[0.14em] outline-none focus:border-indigo-500 sm:max-w-56"
      />
      <button
        type="submit"
        disabled={pending || value.trim().length < 4}
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
      >
        {t.add}
      </button>
    </form>
  );
}
