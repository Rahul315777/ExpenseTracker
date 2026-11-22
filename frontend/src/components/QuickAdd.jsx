import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import api, { errMsg, money } from "../api.js";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants.js";

const pad = (n) => String(n).padStart(2, "0");
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm";
const EXAMPLES = ["Aaj ₹250 ka lunch kiya", "spent 500 on petrol yesterday", "Salary 50000 received", "Netflix 199 paid via gpay"];

export default function QuickAdd({ onSaved }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/wallet/get").then((r) => setWallets(r.data.data.wallets)).catch(() => {}); }, []);

  const cats = draft?.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const understand = async (e) => {
    e.preventDefault(); setError(""); setMsg(""); setBusy(true);
    try {
      const { data } = await api.post("/smart/parse", { text, today: localToday() });
      const d = data.data;
      const list = d.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const category = list.includes(d.category) ? d.category : "Other";
      setDraft({ ...d, category, description: d.description || (category !== "Other" ? category : "Quick entry"), walletId: d.walletId || "" });
    } catch (err) { setDraft(null); setError(errMsg(err)); } finally { setBusy(false); }
  };

  const setKind = (kind) => setDraft({ ...draft, kind, category: "Other" });

  const save = async () => {
    setBusy(true); setError("");
    try {
      await api.post(`/${draft.kind}/add`, { description: draft.description, amount: draft.amount, category: draft.category, date: draft.date, walletId: draft.walletId });
      setMsg(`Added ${draft.kind}: ${draft.description} (${money(draft.amount)})`);
      setDraft(null); setText(""); onSaved?.();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
      <h2 className="font-semibold flex items-center gap-2"><Sparkles size={18} className="text-emerald-600" /> Quick Add</h2>
      <form onSubmit={understand} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Type naturally, e.g. Aaj ₹250 ka lunch kiya" className={inp} />
        <button disabled={busy || text.trim().length < 3} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 shrink-0">{busy && !draft ? "..." : "Add"}</button>
      </form>
      {!draft && !msg && !error && (
        <p className="text-xs text-slate-400">Try: {EXAMPLES.map((x, i) => <button key={x} type="button" onClick={() => setText(x)} className="underline decoration-dotted mr-2">{x}</button>)}</p>
      )}
      {error && <div className="bg-red-50 text-red-700 p-2 rounded-lg text-sm">{error}</div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg text-sm">{msg}</div>}

      {draft && (
        <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-500">Check the details, change anything that looks wrong, then save.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <select value={draft.kind} onChange={(e) => setKind(e.target.value)} className={inp}><option value="expense">Expense</option><option value="income">Income</option></select>
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inp} placeholder="Description" />
            <input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={inp} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inp}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inp} />
            <select value={draft.walletId} onChange={(e) => setDraft({ ...draft, walletId: e.target.value })} className={inp}><option value="">No wallet</option>{wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}</select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !draft.description || !(Number(draft.amount) >= 0)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save</button>
            <button onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
