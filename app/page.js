"use client";
import { useEffect, useState, useCallback } from "react";

const KINDS = { date: "Our date", family: "Family", other: "Other" };
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };
const nice = (s) => new Date(s + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export default function Home() {
  const [code, setCode] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setCode(localStorage.getItem("csc_code")); } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!code) return <Login onIn={(c) => { try { localStorage.setItem("csc_code", c); } catch {} setCode(c); }} />;
  return <Calendar code={code} onOut={() => { try { localStorage.removeItem("csc_code"); } catch {} setCode(null); }} />;
}

function Login({ onIn }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    setErr("");
    const c = val.trim().toUpperCase();
    const r = await fetch("/api/login", { method: "POST", body: JSON.stringify({ code: c }) });
    if (r.ok) onIn(c); else setErr("That code doesn't match. Check it and try again.");
  }
  return (
    <main>
      <h1>Our Calendar</h1>
      <p className="muted">One calendar for the two of you. Enter your code to open it.</p>
      <form className="card stack" onSubmit={submit} style={{ marginTop: 20 }}>
        <input placeholder="Your code" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
        <button className="primary" type="submit">Open</button>
        {err && <p className="muted" style={{ margin: 0 }}>{err}</p>}
      </form>
    </main>
  );
}

function Calendar({ code, onOut }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", date: todayIso(), kind: "date" });
  const [clashes, setClashes] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/events", { headers: { "x-code": code } });
    if (r.ok) setEvents((await r.json()).events);
  }, [code]);
  useEffect(() => { load(); }, [load]);

  async function save(force) {
    setBusy(true);
    const r = await fetch("/api/events", {
      method: "POST", headers: { "x-code": code },
      body: JSON.stringify({ ...form, force }),
    });
    setBusy(false);
    if (r.status === 409) { setClashes((await r.json()).clashes); return; }
    if (r.ok) { setClashes(null); setForm({ ...form, title: "" }); load(); }
  }

  async function remove(id) {
    await fetch("/api/events", { method: "DELETE", headers: { "x-code": code }, body: JSON.stringify({ id }) });
    load();
  }

  const byDate = {};
  for (const e of events) (byDate[e.event_date] ||= []).push(e);

  const first = new Date(month.y, month.m, 1).getDay();
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const t = todayIso();
  const upcoming = events.filter((e) => e.event_date >= t);
  const label = new Date(month.y, month.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shift = (d) => setMonth(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  return (
    <main>
      <div className="top">
        <h1>Our Calendar</h1>
        <button className="link" onClick={onOut}>Leave</button>
      </div>
      <p className="muted">Check here before you say yes to anything.</p>

      <h2>Add a plan</h2>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <input placeholder="e.g. Home date, Mom & Dad's anniversary" value={form.title}
          onChange={(e) => { setForm({ ...form, title: e.target.value }); setClashes(null); }} />
        <div className="row">
          <input type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setClashes(null); }} />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {clashes ? (
          <div className="warn">
            <strong>Before you add this</strong>
            <div className="muted">There's already something on or near {nice(form.date)}:</div>
            <ul>
              {clashes.map((c) => <li key={c.id}>{nice(c.event_date)}: {c.title} <span className="muted">({KINDS[c.kind]})</span></li>)}
            </ul>
            <div className="row">
              <button type="button" onClick={() => setClashes(null)}>Pick another day</button>
              <button type="button" className="primary" disabled={busy} onClick={() => save(true)}>Add anyway</button>
            </div>
          </div>
        ) : (
          <button className="primary" type="submit" disabled={busy || !form.title.trim()}>Add</button>
        )}
      </form>

      <h2>{label}</h2>
      <div className="card">
        <div className="top" style={{ marginBottom: 8 }}>
          <button className="link" onClick={() => shift(-1)}>‹ Prev</button>
          <button className="link" onClick={() => shift(1)}>Next ›</button>
        </div>
        <div className="grid">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="dow">{d}</div>)}
          {Array.from({ length: first }).map((_, i) => <div key={"b" + i} />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = iso(month.y, month.m, i + 1);
            const evs = byDate[d] || [];
            return (
              <button key={d} title={evs.map((e) => e.title).join(", ")}
                className={`day ${d === t ? "today" : ""} ${d === form.date ? "sel" : ""}`}
                onClick={() => { setForm({ ...form, date: d }); setClashes(null); }}>
                {i + 1}
                <span className="dots">{evs.slice(0, 3).map((e) => <span key={e.id} className={`dot k-${e.kind}`} />)}</span>
              </button>
            );
          })}
        </div>
        <div className="legend">
          {Object.entries(KINDS).map(([k, v]) => <span key={k}><i className={`dot k-${k}`} />{v}</span>)}
        </div>
      </div>

      {byDate[form.date]?.length > 0 && (
        <>
          <h2>On {nice(form.date)}</h2>
          <ul className="card list">{byDate[form.date].map((e) => <Item key={e.id} e={e} onRemove={remove} />)}</ul>
        </>
      )}

      <h2>Coming up</h2>
      {upcoming.length ? (
        <ul className="card list">{upcoming.map((e) => <Item key={e.id} e={e} onRemove={remove} />)}</ul>
      ) : (
        <p className="muted">Nothing yet. Add your next date and any family days you know about.</p>
      )}
    </main>
  );
}

function Item({ e, onRemove }) {
  return (
    <li>
      <span className={`dot k-${e.kind}`} />
      <span className="when">{nice(e.event_date)}</span>
      <span className="what">{e.title}{" "}<span className="muted">· {e.mine ? "you" : "partner"}</span></span>
      <button className="link" onClick={() => onRemove(e.id)} aria-label="Remove">✕</button>
    </li>
  );
}
