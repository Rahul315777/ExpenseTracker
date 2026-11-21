import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import api, { errMsg, money } from "../api.js";

const SORTS = [["date_desc", "Newest first"], ["date_asc", "Oldest first"], ["amount_desc", "Amount: high to low"], ["amount_asc", "Amount: low to high"]];
const EMPTY = { q: "", category: "", walletId: "", minAmount: "", maxAmount: "", from: "", to: "", sort: "date_desc" };
const box = "border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white w-full";

export default function TransactionList({ kind, title, categories, wallets, wname, txt, isIncome, refreshKey, onEdit, onDelete }) {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");

  const setF = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const clear = () => { setFilters(EMPTY); setPage(1); };
  const active = Object.keys(EMPTY).some((k) => k !== "sort" && filters[k] !== "");

  // reset when switching between income and expense
  useEffect(() => { setFilters(EMPTY); setPage(1); setRes(null); }, [kind]);

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
      {!res && !error && <p className="text-slate-500 text-sm">Loading...</p>}

      {res && (
        <>
          {res.items.length === 0 ? (
            <p className="text-slate-400 text-sm">{active ? "No results match your filters." : `Nothing here yet. Click “Add ${title}” to start.`}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {res.items.map((t) => (
                <li key={t._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">{t.category}{wname(t.walletId) ? ` · ${wname(t.walletId)}` : ""} · {new Date(t.date).toLocaleDateString("en-IN")}</p>
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
                <button disabled={res.page <= 1} onClick={() => setPage(res.page - 1)} className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                <span>Page {res.page} of {res.pages}</span>
                <button disabled={res.page >= res.pages} onClick={() => setPage(res.page + 1)} className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
