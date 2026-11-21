import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Pencil, Plus, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";
import TransactionList from "../components/TransactionList.jsx";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Business", "Investments", "Gift", "Other"],
  expense: ["Food", "Transport", "Rent", "Shopping", "Bills", "Health", "Entertainment", "Education", "Other"],
};
const RANGES = [["weekly", "Last 7 days"], ["monthly", "This month"], ["yearly", "This year"], ["all", "All time"]];
const today = () => new Date().toISOString().slice(0, 10);
const blank = (kind) => ({ description: "", amount: "", category: CATEGORIES[kind][0], date: today(), walletId: "" });

export default function Transactions({ kind }) {
  const isIncome = kind === "income";
  const title = isIncome ? "Income" : "Expense";
  const txt = isIncome ? "text-emerald-600" : "text-red-600";

  const [range, setRange] = useState("monthly");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank(kind));
  const [saving, setSaving] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [listKey, setListKey] = useState(0);
  const refreshList = () => setListKey((k) => k + 1);
  useEffect(() => { api.get("/wallet/get").then((r) => setWallets(r.data.data.wallets)).catch(() => {}); }, []);
  const wname = (id) => wallets.find((w) => w._id === id)?.name;

  const load = useCallback(() => {
    setError("");
    api.get(`/${kind}/overview`, { params: { range } }).then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [kind, range]);

  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { setForm(blank(kind)); setEditId(null); setModal(false); }, [kind]);

  const openAdd = () => { setEditId(null); setForm(blank(kind)); setModal(true); };
  const openEdit = (t) => {
    setEditId(t._id);
    setForm({ description: t.description, amount: t.amount, category: t.category, date: new Date(t.date).toISOString().slice(0, 10), walletId: t.walletId || "" });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editId) await api.put(`/${kind}/update/${editId}`, form);
      else await api.post(`/${kind}/add`, form);
      setModal(false); load(); refreshList();
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete this ${kind}?`)) return;
    try { await api.delete(`/${kind}/delete/${id}`); load(); refreshList(); } catch (err) { setError(errMsg(err)); }
  };

  const download = async () => {
    try {
      const res = await api.get(`/${kind}/downloadexcel`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `${kind}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(errMsg(err)); }
  };

  const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm">
            {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={download} className="flex items-center gap-1 border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Download size={16} /> Excel</button>
          <button onClick={openAdd} className={`flex items-center gap-1 text-white rounded-lg px-3 py-2 text-sm ${isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}><Plus size={16} /> Add {title}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {!data && !error && <p className="text-slate-500">Loading...</p>}

      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {[["Total", money(data.total)], ["Average", money(data.average)], ["Transactions", data.count]].map(([l, v]) => (
              <div key={l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold ${txt}`}>{v}</p></div>
            ))}
          </div>

          {data.byCategory.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3">By Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="amount" fill={isIncome ? "#10b981" : "#ef4444"} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <TransactionList kind={kind} title={title} categories={CATEGORIES[kind]} wallets={wallets} wname={wname} txt={txt} isIncome={isIncome} refreshKey={listKey} onEdit={openEdit} onDelete={remove} />
        </>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModal(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">{editId ? "Edit" : "Add"} {title}</h2><button type="button" onClick={() => setModal(false)}><X size={20} /></button></div>
            <input required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} />
            <input required type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
              {CATEGORIES[kind].map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} className={inp}>
              <option value="">No wallet (don't track)</option>
              {wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inp} />
            <button disabled={saving} className={`w-full text-white font-semibold py-2 rounded-lg disabled:opacity-60 ${isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{saving ? "Saving..." : "Save"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
