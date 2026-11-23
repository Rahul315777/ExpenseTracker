import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import api, { errMsg, money } from "../api.js";
import { EXPENSE_CATEGORIES } from "../constants.js";

const BAR = { ok: "bg-emerald-500", warning: "bg-amber-500", exceeded: "bg-red-500" };
const BADGE = { ok: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", exceeded: "bg-red-50 text-red-700" };
const LABEL = { ok: "On track", warning: "Near limit", exceeded: "Over budget" };

export default function Budgets() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], limit: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/budget/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError(""); setMsg("");
    try {
      await api.post("/budget/set", form);
      setForm({ ...form, limit: "" }); setMsg("Budget saved"); load();
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try { await api.delete(`/budget/delete/${id}`); load(); } catch (err) { setError(errMsg(err)); }
  };

  const inp = "border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white";
  const alerts = data?.items.filter((i) => i.status !== "ok") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget Planner</h1>
        <p className="text-sm text-slate-500">Monthly limits per category{data ? ` · ${data.month}` : ""}. Budgets repeat every month.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">{msg}</div>}

      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Budget alerts</p>
            <ul className="mt-1 space-y-0.5 text-amber-900">
              {alerts.map((a) => (
                <li key={a._id}>{a.category}: {a.status === "exceeded" ? `over budget by ${money(Math.abs(a.remaining))}` : `${a.percent}% used, ${money(a.remaining)} left`}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={save} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Monthly limit (₹)</label>
          <input required type="number" min="1" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="e.g. 5000" className={inp} /></div>
        <button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{saving ? "Saving..." : "Set budget"}</button>
        <p className="text-xs text-slate-400 w-full">Setting a budget for a category that already has one updates it.</p>
      </form>

      {!data && !error && <p className="text-slate-500">Loading...</p>}

      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {[["Total budget", money(data.totalBudget)], ["Spent (budgeted)", money(data.totalSpent)], ["Remaining", money(data.remaining)]].map(([l, v]) => (
              <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></div>
            ))}
          </div>

          {data.items.length === 0 ? (
            <p className="text-slate-400 text-sm">No budgets yet. Set your first one above.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.items.map((b) => (
                <div key={b._id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{b.category}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[b.status]}`}>{LABEL[b.status]}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${BAR[b.status]}`} style={{ width: `${Math.min(b.percent, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-sm mt-2 text-slate-600">
                    <span>{money(b.spent)} of {money(b.limit)}</span><span>{b.percent}%</span>
                  </div>
                  <p className={`text-xs mt-1 ${b.remaining < 0 ? "text-red-600" : "text-slate-500"}`}>{b.remaining < 0 ? `${money(-b.remaining)} over` : `${money(b.remaining)} left`}</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => { setForm({ category: b.category, limit: b.limit }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-xs"><Pencil size={14} /> Edit</button>
                    <button onClick={() => remove(b._id)} className="text-slate-400 hover:text-red-600 flex items-center gap-1 text-xs"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.unbudgeted.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-2">Spending without a budget</h2>
              <ul className="text-sm divide-y divide-slate-100">
                {data.unbudgeted.map((u) => <li key={u.category} className="py-2 flex justify-between"><span>{u.category}</span><span>{money(u.spent)}</span></li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
