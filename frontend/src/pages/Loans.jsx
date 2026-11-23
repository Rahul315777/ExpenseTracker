import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const blank = () => ({ name: "", lender: "", principal: "", annualRate: "", tenureMonths: "", firstEmiDate: today(), alreadyPaid: "" });
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm";
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// same formula as the server: EMI = P*r*(1+r)^n / ((1+r)^n - 1), r = rate / 12 / 100
const previewEmi = (P, rate, n) => {
  P = Number(P); rate = Number(rate); n = Number(n);
  if (!(P >= 1) || !(n >= 1) || !(rate >= 0)) return null;
  const r = rate / 12 / 100;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return { emi, interest: emi * n - P, total: emi * n };
};

export default function Loans() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null);       // loan whose schedule is open
  const [schedule, setSchedule] = useState([]);

  const load = useCallback(() => { api.get("/loan/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const loadSchedule = async (id) => { try { const r = await api.get(`/loan/${id}`); setSchedule(r.data.data.schedule); } catch (e) { setError(errMsg(e)); } };
  const toggleSchedule = (id) => { if (open === id) { setOpen(null); return; } setOpen(id); setSchedule([]); loadSchedule(id); };

  const run = async (fn) => {
    setError(""); setMsg("");
    try { const r = await fn(); setMsg(r.data.message); load(); return r; } catch (e) { setError(errMsg(e)); return null; }
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    const r = await run(() => (editId ? api.put(`/loan/update/${editId}`, form) : api.post("/loan/add", form)));
    if (r) { setForm(blank()); setEditId(null); if (editId && open === editId) loadSchedule(editId); }
    setSaving(false);
  };
  const edit = (l) => {
    setEditId(l._id);
    setForm({ name: l.name, lender: l.lender || "", principal: l.principal, annualRate: l.annualRate, tenureMonths: l.tenureMonths, firstEmiDate: new Date(l.firstEmiDate).toISOString().slice(0, 10), alreadyPaid: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (l) => window.confirm(`Delete the loan "${l.name}"?`) && run(() => api.delete(`/loan/delete/${l._id}`));
  const setPaid = async (l, row, paid) => {
    const r = await run(() => api.post(`/loan/${l._id}/paid`, { installment: row.installment, paid }));
    if (r) setSchedule(r.data.data.schedule);
  };

  const s = data?.summary;
  const prev = previewEmi(form.principal, form.annualRate, form.tenureMonths);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loans &amp; EMI</h1>
        <p className="text-sm text-slate-500">Track home, bike, car or personal loans: your EMI, how much is left, and the full payment schedule. Unpaid EMIs show up in Upcoming Payments and the Calendar.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex justify-between"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg("")}><X size={14} /></button></div>}

      {s && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[["Total outstanding", money(s.outstanding), ""], ["Monthly EMIs", money(s.monthlyEmi), "text-amber-600"], ["Next EMI", s.nextDue ? `${money(s.nextDue.amount)} · ${fmt(s.nextDue.date)}` : "None", ""], ["Overdue EMIs", String(s.overdue), s.overdue ? "text-red-600" : ""]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className={`text-lg font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">{editId ? "Edit loan" : "Add a loan"}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input required placeholder="Loan name (e.g. Bike loan)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
          <input placeholder="Lender (optional)" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} className={inp} />
          <input required type="number" min="1" placeholder="Loan amount (₹)" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} className={inp} />
          <input required type="number" min="0" max="60" step="0.01" placeholder="Interest rate (% per year)" value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })} className={inp} />
          <input required type="number" min="1" max="480" step="1" placeholder="Tenure (months)" value={form.tenureMonths} onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })} className={inp} />
          <div><input required type="date" value={form.firstEmiDate} onChange={(e) => setForm({ ...form, firstEmiDate: e.target.value })} className={inp} title="Date of the first EMI" /><p className="text-xs text-slate-400 mt-1">Date of the first EMI. Later EMIs fall on the same day each month.</p></div>
          {!editId && <input type="number" min="0" step="1" placeholder="EMIs already paid (optional)" value={form.alreadyPaid} onChange={(e) => setForm({ ...form, alreadyPaid: e.target.value })} className={inp} />}
        </div>
        {prev && (
          <p className="text-sm bg-slate-50 rounded-lg p-3 text-slate-700">Monthly EMI about <b>{money(prev.emi)}</b> · total interest <b>{money(prev.interest)}</b> · you will pay <b>{money(prev.total)}</b> in total.</p>
        )}
        <div className="flex gap-2">
          <button disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"><Plus size={16} /> {editId ? "Save changes" : "Add loan"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(blank()); }} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>}
        </div>
        <p className="text-xs text-slate-400">Uses the standard reducing-balance method banks use. Your bank's EMI can differ by a few rupees because of rounding or processing rules.</p>
      </form>

      {!data && !error && <p className="text-slate-500">Loading...</p>}
      {data && data.loans.length === 0 && <p className="text-slate-400 text-sm">No loans yet.</p>}

      <div className="space-y-4">
        {data?.loans.map((l) => (
          <div key={l._id} className={`bg-white rounded-2xl p-5 shadow-sm border ${l.overdueCount ? "border-red-300" : "border-slate-100"}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-1">{l.closed && <CheckCircle2 size={16} className="text-emerald-600" />}{l.name}</p>
                <p className="text-xs text-slate-500">{l.lender ? `${l.lender} · ` : ""}{money(l.principal)} at {l.annualRate}% for {l.tenureMonths} months · ends {fmt(l.payoffDate)}</p>
              </div>
              <div className="flex gap-3 text-slate-400">
                <button onClick={() => edit(l)} className="hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(l)} className="hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-slate-500">EMI</p><p className="font-bold">{money(l.emi)}</p></div>
              <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold">{money(l.outstanding)}</p></div>
              <div><p className="text-xs text-slate-500">Total interest</p><p className="font-bold">{money(l.totalInterest)}</p></div>
              <div><p className="text-xs text-slate-500">EMIs paid</p><p className="font-bold">{l.paidCount} of {l.tenureMonths}</p></div>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3"><div className={`h-full ${l.closed ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${l.repaidPercent}%` }} /></div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs">
              <span className="text-slate-500">{l.repaidPercent}% of the loan repaid</span>
              {l.closed ? <span className="text-emerald-700 font-medium">Loan fully paid 🎉</span> : l.nextEmi && (
                <span className={`px-2 py-0.5 rounded-full ${l.nextEmi.overdue ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"}`}>
                  {l.overdueCount > 1 ? `${l.overdueCount} EMIs overdue` : `EMI ${l.nextEmi.installment}: ${money(l.nextEmi.amount)} ${l.nextEmi.overdue ? `overdue by ${-l.nextEmi.daysToDue} days` : l.nextEmi.daysToDue === 0 ? "due today" : `due in ${l.nextEmi.daysToDue} days`}`}
                </span>
              )}
            </div>

            <button onClick={() => toggleSchedule(l._id)} className="mt-3 text-xs text-emerald-700 font-medium flex items-center gap-1">{open === l._id ? "Hide schedule" : "Show payment schedule"} {open === l._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>

            {open === l._id && (
              <div className="mt-3 overflow-x-auto max-h-96 overflow-y-auto border border-slate-100 rounded-lg">
                {schedule.length === 0 ? <p className="p-3 text-sm text-slate-400">Loading...</p> : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr>{["#", "Date", "EMI", "Interest", "Principal", "Balance", ""].map((h) => <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {schedule.map((r) => (
                        <tr key={r.installment} className={`border-t border-slate-100 ${r.paid ? "bg-emerald-50/50 text-slate-500" : ""}`}>
                          <td className="px-2 py-1.5">{r.installment}</td><td className="px-2 py-1.5 whitespace-nowrap">{fmt(r.date)}</td>
                          <td className="px-2 py-1.5">{money(r.emi)}</td><td className="px-2 py-1.5">{money(r.interest)}</td><td className="px-2 py-1.5">{money(r.principal)}</td><td className="px-2 py-1.5">{money(r.balance)}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.paid ? <button onClick={() => setPaid(l, r, false)} className="text-slate-400 hover:text-red-600">Paid ✓ Undo</button> : <button onClick={() => setPaid(l, r, true)} className="text-emerald-700 font-medium">Mark paid</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
