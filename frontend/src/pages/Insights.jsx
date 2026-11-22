import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy, Lightbulb } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const pad = (n) => String(n).padStart(2, "0");
const shiftMonth = (m, by) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const nowMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const STYLE = {
  warning: { box: "bg-red-50 border-red-200", icon: AlertTriangle, color: "text-red-600" },
  tip: { box: "bg-amber-50 border-amber-200", icon: Lightbulb, color: "text-amber-600" },
  good: { box: "bg-emerald-50 border-emerald-200", icon: CheckCircle2, color: "text-emerald-600" },
};

export default function Insights() {
  const [month, setMonth] = useState(nowMonth());
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setD(null); setError("");
    api.get("/insights", { params: { month } }).then((r) => setD(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [month]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(d.report); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard not available */ }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Smart Insights</h1>
        <p className="text-sm text-slate-500">Worked out from your own transactions, budgets and subscriptions.</p>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"><ChevronLeft size={16} /></button>
        <div className="text-center"><p className="font-semibold">{d ? d.month : "Loading..."}</p>{month !== nowMonth() && <button onClick={() => setMonth(nowMonth())} className="text-xs text-emerald-700">Back to this month</button>}</div>
        <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"><ChevronRight size={16} /></button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {!d && !error && <p className="text-slate-500">Loading...</p>}

      {d && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[["Income", money(d.stats.totalIncome), "text-emerald-600"], ["Spent", money(d.stats.totalExpense), "text-red-600"], ["Saved", money(d.stats.savings), d.stats.savings < 0 ? "text-red-600" : "text-blue-600"], ["Spent per day", money(d.stats.perDay), ""]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2"><h2 className="font-semibold">Monthly report</h2>
              <button onClick={copy} className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1"><Copy size={14} /> {copied ? "Copied" : "Copy"}</button></div>
            <p className="text-sm text-slate-700 leading-relaxed">{d.report}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold mb-3">Suggestions</h2>
            {d.suggestions.length === 0 ? <p className="text-slate-400 text-sm">Nothing to flag. Add more transactions for better tips.</p> : (
              <div className="space-y-2">
                {d.suggestions.map((s, i) => {
                  const st = STYLE[s.type] || STYLE.tip; const Icon = st.icon;
                  return (
                    <div key={i} className={`border rounded-xl p-3 flex gap-3 ${st.box}`}>
                      <Icon size={18} className={`${st.color} shrink-0 mt-0.5`} />
                      <div className="text-sm"><p className="font-semibold">{s.title}</p><p className="text-slate-700">{s.text}</p></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3">Where your money went</h2>
              {d.categories.length === 0 ? <p className="text-slate-400 text-sm">No expenses this month.</p> : (
                <ul className="space-y-3">
                  {d.categories.map((c) => (
                    <li key={c.category}>
                      <div className="flex justify-between text-sm"><span>{c.category} <span className="text-xs text-slate-400">· {c.count}</span></span><span>{money(c.amount)} · {c.percent}%</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-emerald-500" style={{ width: `${c.percent}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="font-semibold mb-1">Unusual expenses</h2>
                <p className="text-xs text-slate-400 mb-3">Much higher than your usual amount in that category (needs at least 5 earlier entries).</p>
                {d.unusual.length === 0 ? <p className="text-slate-400 text-sm">Nothing unusual found.</p> : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {d.unusual.map((u, i) => (
                      <li key={i} className="py-2"><div className="flex justify-between"><span>{u.description} <span className="text-xs text-slate-400">· {u.category} · {fmt(u.date)}</span></span><span className="font-medium text-red-600">{money(u.amount)}</span></div>
                        <p className="text-xs text-slate-500">{u.times.toFixed(1)}x your usual {u.category} spend ({money(u.usual)})</p></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="font-semibold mb-3">Biggest expenses</h2>
                {d.biggest.length === 0 ? <p className="text-slate-400 text-sm">No expenses this month.</p> : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {d.biggest.map((b, i) => <li key={i} className="py-2 flex justify-between"><span>{b.description} <span className="text-xs text-slate-400">· {b.category} · {fmt(b.date)}</span></span><span className="font-medium">{money(b.amount)}</span></li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
