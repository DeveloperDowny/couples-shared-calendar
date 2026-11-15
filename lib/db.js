// Server-only: calls Supabase RPC functions. Tables are locked by RLS;
// only these functions (which validate the pair code) can read/write.
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;

export async function rpc(fn, args) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "Database error");
  return data;
}

export function shiftDate(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
