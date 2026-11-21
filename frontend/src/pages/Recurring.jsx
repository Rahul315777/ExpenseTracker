import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Pause, Pencil, Play, Repeat, Trash2 } from "lucide-react";
import api, { errMsg, money } from "../api.js";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../constants.js";

const today = () => new Date().toISOString().slice(0, 10);
const FREQ = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const blank = () => ({ kind: "expense", description: "", amount: "", category: EXPENSE_CATEGORIES[0], walletId: "", frequency: "monthly", startDate: today(), isSubscription: false });
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function Recurring() {
  const [data, setData] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState(blank());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api.get("/recurring/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e))); }, []);
  useEffect(() => { load(); api.get("/wallet/get").then((r) => setWallets(r.data.data.wallets)).catch(() => {}); }, [load]);

  const cats = form.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const setKind = (kind) => setForm({ ...form, kind, category: (kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0], isSubscription: false });

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError(""); setMsg("");
    try {
      const r = editId ? await api.put(`/recurring/update/${editId}`, form) : await api.post("/recurring/add", form);
      setMsg(r.data.message); setForm(blank()); setEditId(null); load();
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };
  const edit = (r) => {
    setEditId(r._id);
    setForm({ kind: r.kind, description: r.description, amount: r.amount, category: r.category, walletId: r.walletId || "", frequency: r.frequency, startDate: new Date(r.startDate).toISOString().slice(0, 10), isSubscription: r.isSubscription });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggle = async (r) => {
    setError(""); setMsg("");
    try { await api.put(`/recurring/update/${r._id}`, { ...r, walletId: r.walletId || "", active: !r.active }); load(); } catch (err) { setError(errMsg(err)); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.description}"? Entries already added will stay.`)) return;
    try { const res = await api.delete(`/recurring/delete/${r._id}`); setMsg(res.data.message); load(); } catch (err) { setError(errMsg(err)); }
  };

  const wname = (id) => wallets.find((w) => w._id === id)?.name;
  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recurring &amp; Subscriptions</h1>
        <p className="text-sm text-slate-500">Rent, salary, Netflix, EMIs... Set it once and it is added to your transactions automatically when it is due.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">{msg}</div>}

      {s && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[["Recurring expenses / month", money(s.monthlyExpense), "text-red-600"], ["Subscriptions / month", money(s.monthlySubscriptions), "text-amber-600"], ["Recurring income / month", money(s.monthlyIncome), "text-emerald-600"]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">{editId ? "Edit recurring item" : "Add recurring item"}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select value={form.kind} disabled={!!editId} onChange={(e) => setKind(e.target.value)} className={inp}><option value="expense">Expense</option><option value="income">Income</option></select>
          <input required placeholder="Description (e.g. Netflix)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} />
          <input required type="number" min="0.01" step="0.01" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inp}>{Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} className={inp}><option value="">No wallet</option>{wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}</select>
          <div>
            <input required type="date" disabled={!!editId} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inp} title="First date" />
            {!editId && <p className="text-xs text-slate-400 mt-1">First due date. If it is in the past, the missed entries are added.</p>}
          </div>
          {form.kind === "expense" && (
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={form.isSubscription} onChange={(e) => setForm({ ...form, isSubscription: e.target.checked })} /> This is a subscription (Netflix, Spotify, etc.)</label>
          )}
        </div>
        <div className="flex gap-2">
          <button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{saving ? "Saving..." : editId ? "Save changes" : "Add"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(blank()); }} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>}
        </div>
      </form>

      {!data && !error && <p className="text-slate-500">Loading...</p>}

      {data && (
        <>
          {data.upcoming.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarClock size={18} /> Coming up in the next 30 days</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {data.upcoming.map((u, i) => (
                  <li key={i} className="py-2 flex justify-between"><span>{fmtDate(u.date)} · {u.description}</span><span className={u.kind === "income" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{u.kind === "income" ? "+" : "-"}{money(u.amount)}</span></li>
                ))}
              </ul>
            </div>
          )}

          {data.rules.length === 0 ? <p className="text-slate-400 text-sm">Nothing set up yet. Add your first recurring item above.</p> : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.rules.map((r) => (
                <div key={r._id} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 ${r.active ? "" : "opacity-60"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate flex items-center gap-1"><Repeat size={14} className="text-slate-400 shrink-0" />{r.description}</p>
                      <p className="text-xs text-slate-500">{r.category}{wname(r.walletId) ? ` · ${wname(r.walletId)}` : ""} · {FREQ[r.frequency]}</p>
                    </div>
                    <p className={`font-bold ${r.kind === "income" ? "text-emerald-600" : "text-red-600"}`}>{r.kind === "income" ? "+" : "-"}{money(r.amount)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.isSubscription && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Subscription</span>}
                    {!r.active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Paused</span>}
                    {r.active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600">Next: {fmtDate(r.nextDue)}</span>}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <button onClick={() => toggle(r)} className="flex items-center gap-1 hover:text-emerald-600">{r.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}</button>
                    <button onClick={() => edit(r)} className="flex items-center gap-1 hover:text-blue-600"><Pencil size={14} /> Edit</button>
                    <button onClick={() => remove(r)} className="flex items-center gap-1 hover:text-red-600"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
