import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Banknote, Landmark, Smartphone, Trash2, Wallet as WalletIcon } from "lucide-react";
import api, { errMsg, money } from "../api.js";
import { WALLET_TYPES } from "../constants.js";

const ICONS = { cash: Banknote, bank: Landmark, upi: Smartphone, wallet: WalletIcon };
const today = () => new Date().toISOString().slice(0, 10);
const inp = "border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white";

export default function Wallets() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [wf, setWf] = useState({ name: "", type: "cash", openingBalance: "" });
  const [tf, setTf] = useState({ fromWalletId: "", toWalletId: "", amount: "", note: "", date: today() });

  const load = useCallback(() => {
    api.get("/wallet/get").then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => {
    setError(""); setMsg("");
    try { await fn(); setMsg(okMsg); load(); return true; } catch (e) { setError(errMsg(e)); return false; }
  };

  const addWallet = async (e) => {
    e.preventDefault();
    if (await run(() => api.post("/wallet/add", wf), "Wallet created")) setWf({ name: "", type: "cash", openingBalance: "" });
  };
  const doTransfer = async (e) => {
    e.preventDefault();
    if (await run(() => api.post("/wallet/transfer", tf), "Transfer done")) setTf({ ...tf, amount: "", note: "" });
  };
  const delWallet = (id) => window.confirm("Delete this wallet?") && run(() => api.delete(`/wallet/delete/${id}`), "Wallet deleted");
  const delTransfer = (id) => window.confirm("Delete this transfer? Balances will go back.") && run(() => api.delete(`/wallet/transfer/${id}`), "Transfer deleted");

  const wallets = data?.wallets || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallets</h1>
        <p className="text-sm text-slate-500">Track cash, bank, UPI and wallet balances. Pick a wallet when you add income or expense.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">{msg}</div>}

      {!data && !error && <p className="text-slate-500">Loading...</p>}

      {data && (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500">Total balance (all wallets)</p>
            <p className={`text-2xl font-bold ${data.totalBalance < 0 ? "text-red-600" : ""}`}>{money(data.totalBalance)}</p>
          </div>

          {wallets.length === 0 ? (
            <p className="text-slate-400 text-sm">No wallets yet. Create your first one below.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((w) => {
                const Icon = ICONS[w.type] || WalletIcon;
                return (
                  <div key={w._id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Icon size={18} /></div><div><p className="font-semibold">{w.name}</p><p className="text-xs text-slate-500 capitalize">{w.type}</p></div></div>
                      <button onClick={() => delWallet(w._id)} className="text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
                    </div>
                    <p className={`text-xl font-bold mt-3 ${w.balance < 0 ? "text-red-600" : ""}`}>{money(w.balance)}</p>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={addWallet} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Wallet name</label><input required value={wf.name} onChange={(e) => setWf({ ...wf, name: e.target.value })} placeholder="e.g. HDFC Bank" className={inp} /></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Type</label>
              <select value={wf.type} onChange={(e) => setWf({ ...wf, type: e.target.value })} className={inp}>{WALLET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Opening balance (₹)</label><input type="number" step="0.01" value={wf.openingBalance} onChange={(e) => setWf({ ...wf, openingBalance: e.target.value })} placeholder="0" className={inp} /></div>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg">Add wallet</button>
          </form>

          {wallets.length >= 2 && (
            <form onSubmit={doTransfer} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><ArrowRightLeft size={18} /> Transfer money</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">From</label>
                  <select required value={tf.fromWalletId} onChange={(e) => setTf({ ...tf, fromWalletId: e.target.value })} className={inp}><option value="">Select</option>{wallets.map((w) => <option key={w._id} value={w._id}>{w.name} ({money(w.balance)})</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">To</label>
                  <select required value={tf.toWalletId} onChange={(e) => setTf({ ...tf, toWalletId: e.target.value })} className={inp}><option value="">Select</option>{wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Amount (₹)</label><input required type="number" min="0.01" step="0.01" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} className={inp} /></div>
                <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Date</label><input required type="date" value={tf.date} onChange={(e) => setTf({ ...tf, date: e.target.value })} className={inp} /></div>
                <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">Note (optional)</label><input value={tf.note} onChange={(e) => setTf({ ...tf, note: e.target.value })} className={inp} /></div>
                <button className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg">Transfer</button>
              </div>
            </form>
          )}
          {wallets.length === 1 && <p className="text-xs text-slate-400">Add one more wallet to transfer money between wallets.</p>}

          {data.transfers.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3">Recent transfers</h2>
              <ul className="divide-y divide-slate-100">
                {data.transfers.map((t) => (
                  <li key={t._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium">{t.fromName} → {t.toName}</p><p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString("en-IN")}{t.note ? ` · ${t.note}` : ""}</p></div>
                    <div className="flex items-center gap-3"><p className="font-semibold">{money(t.amount)}</p><button onClick={() => delTransfer(t._id)} className="text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={16} /></button></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
