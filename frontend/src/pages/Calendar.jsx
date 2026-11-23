import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const short = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1).replace(".0", "")}L` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(Math.round(n)));
const monthLabel = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const shiftMonth = (m, by) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const fmtDay = (k) => new Date(k + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default function Calendar() {
  const todayKey = localKey(new Date());
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(todayKey);

  useEffect(() => {
    setData(null); setError("");
    api.get("/calendar/month", { params: { month } }).then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [month]);

  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1;
  const offset = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const dueBy = {};
  (data?.due || []).forEach((d) => { (dueBy[d.date] = dueBy[d.date] || []).push(d); });
  const key = (day) => `${month}-${pad(day)}`;
  const selDay = data?.days[selected];
  const selDue = dueBy[selected] || [];
  const inMonth = selected.startsWith(month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial Calendar</h1>
        <p className="text-sm text-slate-500">See what you earned and spent each day, and which payments are coming up.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"><ChevronLeft size={16} /></button>
          <div className="text-center"><p className="font-semibold">{monthLabel(month)}</p>{month !== todayKey.slice(0, 7) && <button onClick={() => { setMonth(todayKey.slice(0, 7)); setSelected(todayKey); }} className="text-xs text-emerald-700">Back to today</button>}</div>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"><ChevronRight size={16} /></button>
        </div>

        {data && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">Income</p><p className="font-bold text-emerald-600">{money(data.totals.income)}</p></div>
            <div><p className="text-xs text-slate-500">Spent</p><p className="font-bold text-red-600">{money(data.totals.expense)}</p></div>
            <div><p className="text-xs text-slate-500">Still to pay this month</p><p className="font-bold text-amber-600">{money(data.totals.upcomingExpense)}</p></div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">{WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const k = key(day), d = data?.days[k], due = dueBy[k] || [];
            const dueExp = due.filter((x) => x.kind === "expense");
            const isToday = k === todayKey, isSel = k === selected;
            return (
              <button key={k} onClick={() => setSelected(k)}
                className={`min-h-[64px] sm:min-h-[84px] rounded-lg border p-1 text-left flex flex-col gap-0.5 ${isSel ? "border-emerald-500 bg-emerald-50" : "border-slate-100 hover:bg-slate-50"}`}>
                <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-emerald-600 text-white" : "text-slate-700"}`}>{day}</span>
                {d?.income > 0 && <span className="text-[10px] leading-tight text-emerald-600 font-medium">+{short(d.income)}</span>}
                {d?.expense > 0 && <span className="text-[10px] leading-tight text-red-600 font-medium">-{short(d.expense)}</span>}
                {dueExp.length > 0 && <span className="text-[10px] leading-tight text-amber-600 bg-amber-50 rounded px-0.5 truncate">Due {short(dueExp.reduce((a, c) => a + c.amount, 0))}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">Green = income, red = spent, yellow "Due" = a recurring payment that will be added automatically.</p>
      </div>

      {!data && !error && <p className="text-slate-500">Loading...</p>}

      {data && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold mb-3">{fmtDay(selected)}</h2>
          {!inMonth ? <p className="text-slate-400 text-sm">Pick a day from the month shown above.</p>
            : !selDay && selDue.length === 0 ? <p className="text-slate-400 text-sm">Nothing on this day.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {selDay?.items.map((t) => (
                <li key={t._id} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0 truncate">{t.description} <span className="text-xs text-slate-400">· {t.category}{t.auto ? " · Auto" : ""}</span></span>
                  <span className={`font-medium shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</span>
                </li>
              ))}
              {selDue.map((u, i) => (
                <li key={`d${i}`} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0 truncate">{u.description} <span className="text-xs text-amber-600">· Due{u.isSubscription ? " · Subscription" : ""}</span></span>
                  <span className="font-medium shrink-0 text-amber-600">{u.kind === "income" ? "+" : "-"}{money(u.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
