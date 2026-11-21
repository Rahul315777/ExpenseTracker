import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { errMsg, money } from "../api.js";

// For expenses, going UP is bad (red); for income and savings, going UP is good (green).
function Change({ value, upIsGood }) {
  if (value === null) return <span className="text-xs text-slate-400">new this month</span>;
  if (value === 0) return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus size={12} /> no change</span>;
  const up = value > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={`text-xs font-medium flex items-center gap-0.5 ${good ? "text-emerald-600" : "text-red-600"}`}><Icon size={14} />{Math.abs(value)}% {up ? "higher" : "lower"}</span>;
}

export default function MonthlyComparison() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/analytics/comparison").then((r) => setD(r.data.data)).catch((e) => setError(errMsg(e))); }, []);

  if (error) return <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>;
  if (!d) return <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-slate-500 text-sm">Loading comparison...</div>;

  const savingsChange = d.lastMonth.savings === 0 ? (d.thisMonth.savings === 0 ? 0 : null) : Math.round(((d.thisMonth.savings - d.lastMonth.savings) / Math.abs(d.lastMonth.savings)) * 100);
  const rows = [
    { label: "Expenses", now: d.thisMonth.expense, before: d.lastMonth.expense, change: d.expenseChange, upIsGood: false },
    { label: "Income", now: d.thisMonth.income, before: d.lastMonth.income, change: d.incomeChange, upIsGood: true },
    { label: "Savings", now: d.thisMonth.savings, before: d.lastMonth.savings, change: savingsChange, upIsGood: true },
  ];

  let insight = "";
  if (d.lastMonth.expense === 0 && d.thisMonth.expense === 0) insight = "No expenses recorded for the last two months yet.";
  else if (d.expenseChange === null) insight = `You have spent ${money(d.thisMonth.expense)} so far this month, with no expenses last month to compare.`;
  else if (d.expenseChange > 0) insight = `You have spent ${d.expenseChange}% more than ${d.lastMonth.label} (${money(d.thisMonth.expense - d.lastMonth.expense)} extra).`;
  else if (d.expenseChange < 0) insight = `Nice, you have spent ${Math.abs(d.expenseChange)}% less than ${d.lastMonth.label} (${money(d.lastMonth.expense - d.thisMonth.expense)} saved).`;
  else insight = `Your spending is the same as ${d.lastMonth.label}.`;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
      <div>
        <h2 className="font-semibold">Monthly Comparison</h2>
        <p className="text-sm text-slate-500">{d.thisMonth.label} vs {d.lastMonth.label}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="border border-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-500">{r.label}</p>
            <p className="text-lg font-bold">{money(r.now)}</p>
            <p className="text-xs text-slate-500 mb-1">Last month: {money(r.before)}</p>
            <Change value={r.change} upIsGood={r.upIsGood} />
          </div>
        ))}
      </div>

      <p className="text-sm bg-slate-50 rounded-lg p-3 text-slate-700">{insight}</p>

      {d.categories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Expenses by category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
              <Bar dataKey="lastMonth" name="Last month" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="thisMonth" name="This month" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
