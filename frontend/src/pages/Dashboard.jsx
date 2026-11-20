import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Percent } from "lucide-react";
import api, { errMsg, money } from "../api.js";

export const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];
const RANGES = [["weekly", "Last 7 days"], ["monthly", "This month"], ["yearly", "This year"], ["all", "All time"]];

function Card({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}><Icon size={22} /></div>
      <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState("monthly");
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setD(null); setError("");
    api.get("/dashboard", { params: { range } }).then((r) => setD(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm">
          {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {!d && !error && <p className="text-slate-500">Loading...</p>}
      {d && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card icon={ArrowUpCircle} label="Total Income" value={money(d.totalIncome)} color="bg-emerald-50 text-emerald-600" />
            <Card icon={ArrowDownCircle} label="Total Expense" value={money(d.totalExpense)} color="bg-red-50 text-red-600" />
            <Card icon={PiggyBank} label="Savings" value={money(d.savings)} color="bg-blue-50 text-blue-600" />
            <Card icon={Percent} label="Savings Rate" value={`${d.savingsRate}%`} color="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3">Income vs Expense</h2>
              {d.trend.length === 0 ? <p className="text-slate-400 text-sm py-10 text-center">No data for this period yet.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={d.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b98133" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef444433" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold mb-3">Expense by Category</h2>
              {d.expenseDistribution.length === 0 ? <p className="text-slate-400 text-sm py-10 text-center">No expenses yet.</p> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={d.expenseDistribution} dataKey="amount" nameKey="category" innerRadius={45} outerRadius={80}>
                        {d.expenseDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="text-sm space-y-1 mt-2">
                    {d.expenseDistribution.map((x, i) => (
                      <li key={x.category} className="flex justify-between"><span className="flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{x.category}</span><span>{x.percent}%</span></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold mb-3">Recent Transactions</h2>
            {d.recent.length === 0 ? <p className="text-slate-400 text-sm">No transactions yet. Add some from the Income or Expense page.</p> : (
              <ul className="divide-y divide-slate-100">
                {d.recent.map((t) => (
                  <li key={t._id} className="py-3 flex items-center justify-between">
                    <div><p className="font-medium">{t.description}</p><p className="text-xs text-slate-500">{t.category} · {new Date(t.date).toLocaleDateString("en-IN")}</p></div>
                    <p className={`font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
