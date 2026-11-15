import { rpc, shiftDate } from "@/lib/db";

const code = (req) => (req.headers.get("x-code") || "").trim();

export async function GET(req) {
  const events = await rpc("csc_list", { p_code: code(req) });
  return Response.json({ events });
}

// Core feature: before saving, look for anything on the same day or the
// day before/after. If found and not confirmed, return the clashes so the
// person sees them BEFORE the plan is made.
export async function POST(req) {
  const { title, date, kind, force } = await req.json();
  if (!title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return Response.json({ error: "Add a title and a date." }, { status: 400 });
  }
  if (!force) {
    const all = await rpc("csc_list", { p_code: code(req) });
    const near = new Set([shiftDate(date, -1), date, shiftDate(date, 1)]);
    const clashes = all.filter((e) => near.has(e.event_date));
    if (clashes.length) return Response.json({ clashes }, { status: 409 });
  }
  try {
    const id = await rpc("csc_add", { p_code: code(req), p_title: title, p_date: date, p_kind: kind || "other" });
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  const { id } = await req.json();
  await rpc("csc_delete", { p_code: code(req), p_id: id });
  return Response.json({ ok: true });
}
