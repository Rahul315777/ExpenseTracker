import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const blank = () => ({ direction: "lent", person: "", amount: "", date: today(), dueDate: "", note: "" });
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm";
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const TABS = [["all", "All"], ["lent", "They owe me"], ["borrowed", "I owe"], ["settled", "Settled"]];

export default function Debts() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank());
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null);
  const [pay, setPay] = useState({ amount: "", note: "" });
  const [history, setHistory] = useState(null);

  const load = useCallback(() => { api.get("/debt/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError(""); setMsg("");
    try { const r = await fn(); setMsg(r.data.message); load(); return true; } catch (e) { setError(errMsg(e)); return false; }
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    if (await run(() => (editId ? api.put(`/debt/update/${editId}`, form) : api.post("/debt/add", form)))) { setForm(blank()); setEditId(null); }
    setSaving(false);
  };
  const edit = (d) => {
    setEditId(d._id);
    setForm({ direction: d.direction, person: d.person, amount: d.amount, date: new Date(d.date).toISOString().slice(0, 10), dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0, 10) : "", note: d.note });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (d) => window.confirm(`Delete the record with ${d.person}?`) && run(() => api.delete(`/debt/delete/${d._id}`));
  const addPayment = async (d, full) => {
    const amount = full ? d.remaining : Number(pay.amount);
    if (!(amount > 0)) { setError("Enter an amount greater than 0"); return; }
    if (await run(() => api.post(`/debt/${d._id}/payment`, { amount, note: pay.note }))) setPay({ amount: "", note: "" });
  };
  const delPayment = (d, p) => window.confirm("Remove this payment?") && run(() => api.delete(`/debt/${d._id}/payment/${p._id}`));

  const s = data?.summary;
  const shown = (data?.debts || []).filter((d) => (tab === "all" ? true : tab === "settled" ? d.settled : !d.settled && d.direction === tab));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Debt Manager</h1>
        <p className="text-sm text-slate-500">Keep track of money you lent or borrowed and when it is paid back. These records are separate from your wallet balances.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex justify-between"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg("")}><X size={14} /></button></div>}

      {s && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[["You will receive", money(s.toReceive), "text-emerald-600"], ["You have to pay", money(s.toPay), "text-red-600"], ["Net", money(s.net), s.net < 0 ? "text-red-600" : "text-blue-600"], ["Overdue", String(s.overdue), s.overdue ? "text-red-600" : ""]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      {data?.people.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold mb-3">By person</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.people.map((p) => (
              <li key={p.person} className="py-2 flex justify-between"><span>{p.person}</span>
                <span className={p.net >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{p.net === 0 ? "Even" : p.net > 0 ? `owes you ${money(p.net)}` : `you owe ${money(-p.net)}`}</span></li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">{editId ? "Edit record" : "Add a record"}</h2>
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {[["lent", "I gave money"], ["borrowed", "I took money"]].map(([v, l]) => (
            <button type="button" key={v} onClick={() => setForm({ ...form, direction: v })} className={`px-3 py-1.5 ${form.direction === v ? "bg-emerald-600 text-white" : "bg-white text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input required placeholder="Person's name" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} className={inp} />
          <input required type="number" min="1" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} />
          <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inp} title="Date" />
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inp} title="Due date (optional)" />
          <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={`${inp} lg:col-span-2`} />
        </div>
        <p className="text-xs text-slate-400">Due date is optional. If you set one, overdue records are highlighted.</p>
        <div className="flex gap-2">
          <button disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"><Plus size={16} /> {editId ? "Save changes" : "Add"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(blank()); }} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>}
        </div>
      </form>

      <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm bg-white">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3 py-1.5 ${tab === v ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button>)}
      </div>

      {!data && !error && <p className="text-slate-500">Loading...</p>}
      {data && shown.length === 0 && <p className="text-slate-400 text-sm">Nothing here.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {shown.map((d) => (
          <div key={d._id} className={`bg-white rounded-2xl p-5 shadow-sm border ${d.overdue ? "border-red-300" : "border-slate-100"}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate flex items-center gap-1">{d.settled && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}{d.person}</p>
                <p className="text-xs text-slate-500">{d.direction === "lent" ? "You gave" : "You took"} {money(d.amount)} on {fmt(d.date)}{d.note ? ` · ${d.note}` : ""}</p>
              </div>
              <div className="flex gap-3 text-slate-400">
                <button onClick={() => edit(d)} className="hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(d)} className="hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3"><div className={`h-full ${d.settled ? "bg-emerald-500" : d.direction === "lent" ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${Math.min(d.percent, 100)}%` }} /></div>
            <div className="flex justify-between text-sm mt-2 text-slate-600"><span>{money(d.paid)} paid back</span><span className="font-medium">{d.settled ? "Settled" : `${money(d.remaining)} left`}</span></div>

            <div className="flex flex-wrap gap-1 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.direction === "lent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{d.direction === "lent" ? "They owe you" : "You owe them"}</span>
              {d.dueDate && !d.settled && <span className={`text-xs px-2 py-0.5 rounded-full ${d.overdue ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"}`}>{d.overdue ? `Overdue by ${-d.daysToDue} day${d.daysToDue === -1 ? "" : "s"}` : d.daysToDue === 0 ? "Due today" : `Due in ${d.daysToDue} day${d.daysToDue === 1 ? "" : "s"}`} · {fmt(d.dueDate)}</span>}
            </div>

            <div className="flex gap-4 mt-3 text-xs">
              {!d.settled && <button onClick={() => { setOpen(open === d._id ? null : d._id); setPay({ amount: "", note: "" }); }} className="text-emerald-700 font-medium">{open === d._id ? "Close" : d.direction === "lent" ? "Record repayment" : "Record payment"}</button>}
              {d.paymentCount > 0 && <button onClick={() => setHistory(history === d._id ? null : d._id)} className="text-slate-500 flex items-center gap-0.5">History {history === d._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
            </div>

            {open === d._id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input type="number" min="1" placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={`${inp} !w-28`} />
                <input placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={`${inp} !w-40`} />
                <button onClick={() => addPayment(d, false)} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm">Add</button>
                <button onClick={() => addPayment(d, true)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">Settle full {money(d.remaining)}</button>
              </div>
            )}

            {history === d._id && (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {d.payments.map((p) => (
                  <li key={p._id} className="py-2 flex justify-between items-center gap-2">
                    <span className="text-slate-600 min-w-0 truncate">{fmt(p.date)}{p.note ? ` · ${p.note}` : ""}</span>
                    <span className="flex items-center gap-2 shrink-0"><span className="font-medium">{money(p.amount)}</span><button onClick={() => delPayment(d, p)} className="text-slate-300 hover:text-red-600"><Trash2 size={13} /></button></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
