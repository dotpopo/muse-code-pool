# Muse Code Pool (International)

Supabase-backed web app for a Muse invite-code pool. Lovable-compatible stack: Vite + React + TypeScript + Tailwind + Supabase.

**已修复原版的问题：**
- 原版没有假数据了 — 原项目的 `migrations/0002_pool.sql` 里写死了 36 条种子 code（AVSRPQ 等）和伪造发放记录，这就是"还没添加就展示一堆 code"的原因。本版数据库从空开始。
- 新增的 code 会立刻出现在"Newest codes"网格最前面（无需刷新）。
- 最初不足 12 个时，网格尾部用虚线空位占位等待新 code；满了之后只展示最新一批 12 个。

## Setup

1. Supabase Dashboard → SQL Editor，依次执行 `supabase/schema.sql` 和 `supabase/rpc.sql`。
2. 设置环境变量（本地 `.env` 或 Lovable → Settings → Environment Variables）：
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
3. `npm install && npm run dev`

## Language

Default English. Top-right switch EN / 中文 (persisted in localStorage).

## Deploy

Any static host (Vercel / Netlify / Lovable publish): build command `npm run build`, output `dist`.
