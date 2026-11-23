import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm";
const blank = { name: "", targetAmount: "", targetDate: "" };
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function Goals() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null);          // goal whose "add money" box is open
  const [money_, setMoney] = useState({ amount: "", note: "" });
  const [history, setHistory] = useState(null);    // goal whose history is open

  const load = useCallback(() => { api.get("/goal/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError(""); setMsg("");
    try { const r = await fn(); setMsg(r.data.message); load(); return true; } catch (e) { setError(errMsg(e)); return false; }
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    const ok = await run(() => (editId ? api.put(`/goal/update/${editId}`, form) : api.post("/goal/add", form)));
    if (ok) { setForm(blank); setEditId(null); }
    setSaving(false);
  };
  const edit = (g) => {
    setEditId(g._id);
    setForm({ name: g.name, targetAmount: g.targetAmount, targetDate: g.targetDate ? new Date(g.targetDate).toISOString().slice(0, 10) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (g) => window.confirm(`Delete goal "${g.name}"?`) && run(() => api.delete(`/goal/delete/${g._id}`));
  const contribute = async (g, sign) => {
    const amt = Number(money_.amount);
    if (!amt || amt <= 0) { setError("Enter an amount greater than 0"); return; }
    if (await run(() => api.post(`/goal/${g._id}/contribute`, { amount: sign * amt, note: money_.note }))) setMoney({ amount: "", note: "" });
  };
  const delEntry = (g, c) => window.confirm("Remove this entry?") && run(() => api.delete(`/goal/${g._id}/contribution/${c._id}`));

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <p className="text-sm text-slate-500">Save for a laptop, a trip or an emergency fund. Goals are tracked on their own and don't change your wallet balances.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex justify-between"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg("")}><X size={14} /></button></div>}

      {s && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[["Total saved", money(s.totalSaved)], ["Total of all targets", money(s.totalTarget)], ["Goals reached", `${s.completed} of ${s.count}`]].map(([l, v]) => (
            <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">{editId ? "Edit goal" : "New goal"}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <input required placeholder="Goal (e.g. Laptop)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
          <input required type="number" min="1" placeholder="Target amount (₹)" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className={inp} />
          <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className={inp} title="Target date (optional)" />
        </div>
        <p className="text-xs text-slate-400">Add a target date to see how much you need to save every month.</p>
        <div className="flex gap-2">
          <button disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"><Plus size={16} /> {editId ? "Save changes" : "Create goal"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(blank); }} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>}
        </div>
      </form>

      {!data && !error && <p className="text-slate-500">Loading...</p>}
      {data && data.goals.length === 0 && <p className="text-slate-400 text-sm">No goals yet. Create your first one above.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {data?.goals.map((g) => (
          <div key={g._id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate flex items-center gap-1">{g.completed && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}{g.name}</p>
                <p className="text-xs text-slate-500">{g.targetDate ? `Target: ${fmtDate(g.targetDate)}` : "No target date"}</p>
              </div>
              <div className="flex gap-3 text-slate-400">
                <button onClick={() => edit(g)} className="hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(g)} className="hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className={`h-full ${g.completed ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(Math.max(g.percent, 0), 100)}%` }} />
            </div>
            <div className="flex justify-between text-sm mt-2 text-slate-600"><span>{money(g.saved)} of {money(g.targetAmount)}</span><span>{g.percent}%</span></div>

            <p className="text-xs mt-1 text-slate-500">
              {g.completed ? "🎉 Goal reached!"
                : g.overdue ? <span className="text-red-600">Target date has passed. {money(g.remaining)} still to go.</span>
                : g.perMonth !== null ? `${money(g.remaining)} to go · save about ${money(g.perMonth)} per month (${g.daysLeft} days left)`
                : `${money(g.remaining)} to go`}
            </p>

            <div className="flex gap-4 mt-3 text-xs">
              <button onClick={() => { setOpen(open === g._id ? null : g._id); setMoney({ amount: "", note: "" }); }} className="text-emerald-700 font-medium">{open === g._id ? "Close" : "Add / withdraw money"}</button>
              {g.contributionCount > 0 && <button onClick={() => setHistory(history === g._id ? null : g._id)} className="text-slate-500 flex items-center gap-0.5">History {history === g._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
            </div>

            {open === g._id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input type="number" min="1" placeholder="Amount" value={money_.amount} onChange={(e) => setMoney({ ...money_, amount: e.target.value })} className={`${inp} !w-28`} />
                <input placeholder="Note (optional)" value={money_.note} onChange={(e) => setMoney({ ...money_, note: e.target.value })} className={`${inp} !w-40`} />
                <button onClick={() => contribute(g, 1)} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm">Add</button>
                <button onClick={() => contribute(g, -1)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">Withdraw</button>
              </div>
            )}

            {history === g._id && (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {g.contributions.map((c) => (
                  <li key={c._id} className="py-2 flex justify-between items-center gap-2">
                    <span className="text-slate-600 min-w-0 truncate">{fmtDate(c.date)}{c.note ? ` · ${c.note}` : ""}</span>
                    <span className="flex items-center gap-2 shrink-0"><span className={c.amount >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{c.amount >= 0 ? "+" : "-"}{money(Math.abs(c.amount))}</span><button onClick={() => delEntry(g, c)} className="text-slate-300 hover:text-red-600"><Trash2 size={13} /></button></span>
                  </li>
                ))}
                {g.contributionCount > g.contributions.length && <li className="py-2 text-xs text-slate-400">Showing the latest {g.contributions.length} of {g.contributionCount} entries</li>}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
