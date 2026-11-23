import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { errMsg, money } from "../api.js";

const PERIODS = [["daily", "Daily", "last 30 days"], ["weekly", "Weekly", "last 12 weeks"], ["monthly", "Monthly", "last 12 months"]];

export default function SpendingTrends() {
  const [period, setPeriod] = useState("daily");
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setD(null); setError("");
    api.get("/analytics/trends", { params: { period } }).then((r) => setD(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [period]);

  const info = PERIODS.find((p) => p[0] === period);
  const empty = d && d.totalExpense === 0 && d.totalIncome === 0;
  const unit = { daily: "day", weekly: "week", monthly: "month" }[period];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Spending Trends</h2>
          <p className="text-sm text-slate-500">Income vs expenses, {info[2]}</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {PERIODS.map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1.5 ${period === v ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {!d && !error && <p className="text-slate-500 text-sm">Loading...</p>}

      {d && (
        <>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">Total spent</p><p className="font-bold text-red-600">{money(d.totalExpense)}</p></div>
            <div><p className="text-xs text-slate-500">Total income</p><p className="font-bold text-emerald-600">{money(d.totalIncome)}</p></div>
            <div><p className="text-xs text-slate-500">Avg spend / {unit}</p><p className="font-bold">{money(d.avgExpense)}</p></div>
          </div>
          {empty ? <p className="text-slate-400 text-sm py-8 text-center">No transactions in this period yet.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={period === "daily" ? 4 : 0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </div>
  );
}
