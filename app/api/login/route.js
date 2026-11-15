import { rpc } from "@/lib/db";

export async function POST(req) {
  const { code } = await req.json();
  const ok = await rpc("csc_check", { p_code: String(code || "").trim() });
  return Response.json({ ok }, { status: ok ? 200 : 401 });
}
