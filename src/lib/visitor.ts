// Stable visitor id stored locally; no accounts needed.
const KEY = "pool_vid";

export function visitorId(): string {
  let id = localStorage.getItem(KEY);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
