import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const SORTS = [["date_desc", "Newest first"], ["date_asc", "Oldest first"], ["amount_desc", "Amount: high to low"], ["amount_asc", "Amount: low to high"]];
const EMPTY = { q: "", category: "", walletId: "", minAmount: "", maxAmount: "", from: "", to: "", sort: "date_desc" };
const box = "border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white w-full";

export default function TransactionList({ kind, title, categories, wallets, wname, txt, isIncome, refreshKey, onEdit, onDelete, onChanged }) {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState({ category: "", walletId: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => { setSelected(new Set()); setBulk({ category: "", walletId: "" }); };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} selected ${selected.size === 1 ? "entry" : "entries"}? This can't be undone.`)) return;
    setBusy(true); setError("");
    try {
      const r = await api.post(`/${kind}/bulk-delete`, { ids: [...selected] });
      setNotice(r.data.message); clearSel(); onChanged();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const bulkApply = async () => {
    setBusy(true); setError("");
    try {
      const r = await api.post(`/${kind}/bulk-update`, { ids: [...selected], category: bulk.category, walletId: bulk.walletId });
      setNotice(r.data.message); clearSel(); onChanged();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const setF = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); setSelected(new Set()); };
  const clear = () => { setFilters(EMPTY); setPage(1); setSelected(new Set()); };
  const active = Object.keys(EMPTY).some((k) => k !== "sort" && filters[k] !== "");

  // reset when switching between income and expense
  useEffect(() => { setFilters(EMPTY); setPage(1); setRes(null); setSelected(new Set()); setNotice(""); }, [kind]);

  // fetch (short delay so typing in search doesn't fire a request per letter)
  useEffect(() => {
    const t = setTimeout(() => {
      setError("");
      const params = { ...filters, page, limit: 10 };
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      api.get(`/${kind}/search`, { params })
        .then((r) => {
          // if the current page became empty (e.g. last item on it was deleted), go back a page
          if (r.data.data.items.length === 0 && page > 1) setPage(page - 1);
          else setRes(r.data.data);
        })
        .catch((e) => setError(errMsg(e)));
    }, 350);
    return () => clearTimeout(t);
  }, [kind, filters, page, refreshKey]);

  const from = res && res.total ? (res.page - 1) * res.limit + 1 : 0;
  const to = res ? Math.min(res.page * res.limit, res.total) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">All {title}</h2>
        {active && <button onClick={clear} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"><X size={14} /> Clear filters</button>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={filters.q} onChange={(e) => setF("q", e.target.value)} placeholder="Search description..." className={`${box} pl-9`} />
        </div>
        <select value={filters.category} onChange={(e) => setF("category", e.target.value)} className={box}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.walletId} onChange={(e) => setF("walletId", e.target.value)} className={box}>
          <option value="">All wallets</option>
          <option value="none">No wallet</option>
          {wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
        </select>
        <input type="number" min="0" value={filters.minAmount} onChange={(e) => setF("minAmount", e.target.value)} placeholder="Min amount" className={box} />
        <input type="number" min="0" value={filters.maxAmount} onChange={(e) => setF("maxAmount", e.target.value)} placeholder="Max amount" className={box} />
        <input type="date" value={filters.from} onChange={(e) => setF("from", e.target.value)} title="From date" className={box} />
        <input type="date" value={filters.to} onChange={(e) => setF("to", e.target.value)} title="To date" className={box} />
        <select value={filters.sort} onChange={(e) => setF("sort", e.target.value)} className={`${box} lg:col-span-4`}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex justify-between"><span>{notice}</span><button onClick={() => setNotice("")}><X size={14} /></button></div>}
      {!res && !error && <p className="text-slate-500 text-sm">Loading...</p>}

      {res && (
        <>
          {res.items.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-fit">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600"
                checked={res.items.length > 0 && res.items.every((t) => selected.has(t._id))}
                onChange={(e) => setSelected(e.target.checked ? new Set(res.items.map((t) => t._id)) : new Set())} />
              Select all on this page
            </label>
          )}

          {selected.size > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-emerald-800">{selected.size} selected</span>
              <select value={bulk.category} onChange={(e) => setBulk({ ...bulk, category: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Change category...</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={bulk.walletId} onChange={(e) => setBulk({ ...bulk, walletId: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Change wallet...</option>
                <option value="none">No wallet</option>
                {wallets.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
              <button disabled={busy || (!bulk.category && !bulk.walletId)} onClick={bulkApply} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-40"><Check size={14} /> Apply</button>
              <button disabled={busy} onClick={bulkDelete} className="flex items-center gap-1 bg-red-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"><Trash2 size={14} /> Delete selected</button>
              <button onClick={clearSel} className="text-slate-500 hover:text-slate-800 px-2">Cancel</button>
            </div>
          )}

          {res.items.length === 0 ? (
            <p className="text-slate-400 text-sm">{active ? "No results match your filters." : `Nothing here yet. Click “Add ${title}” to start.`}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {res.items.map((t) => (
                <li key={t._id} className={`py-3 flex items-center justify-between gap-3 ${selected.has(t._id) ? "bg-emerald-50/60" : ""}`}>
                  <input type="checkbox" className="h-4 w-4 accent-emerald-600 shrink-0" checked={selected.has(t._id)} onChange={() => toggle(t._id)} aria-label="Select" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">{t.category}{wname(t.walletId) ? ` · ${wname(t.walletId)}` : ""}{t.recurringId ? " · Auto" : ""} · {new Date(t.date).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold ${txt}`}>{isIncome ? "+" : "-"}{money(t.amount)}</p>
                    <button onClick={() => onEdit(t)} className="text-slate-400 hover:text-blue-600" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => onDelete(t._id)} className="text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 pt-1">
            <span>{res.total === 0 ? "0 results" : `Showing ${from}-${to} of ${res.total}`} · Total {money(res.totalAmount)}</span>
            {res.pages > 1 && (
              <div className="flex items-center gap-2">
                <button disabled={res.page <= 1} onClick={() => { setPage(res.page - 1); setSelected(new Set()); }} className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                <span>Page {res.page} of {res.pages}</span>
                <button disabled={res.page >= res.pages} onClick={() => { setPage(res.page + 1); setSelected(new Set()); }} className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
