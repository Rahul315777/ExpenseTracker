import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing } from "lucide-react";
import api, { money } from "../api.js";

const daysUntil = (iso) => {
  const t = new Date(); const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((new Date(iso).getTime() - today) / 86400000);
};
const label = (n) => (n <= 0 ? "Due today" : n === 1 ? "Tomorrow" : `In ${n} days`);

export default function UpcomingPayments() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/recurring/get").then((r) => setItems(r.data.data.upcoming.filter((u) => u.kind === "expense" && daysUntil(u.date) <= 14).slice(0, 5))).catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2"><BellRing size={18} className="text-amber-600" /> Upcoming Payments</h2>
        <Link to="/calendar" className="text-xs text-emerald-700">Open calendar</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">No payments due in the next 14 days. Add bills, EMIs and subscriptions on the <Link to="/recurring" className="text-emerald-700">Recurring</Link> page.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((u, i) => {
            const n = daysUntil(u.date);
            return (
              <li key={i} className="py-2 flex justify-between items-center gap-3">
                <span className="min-w-0 truncate">{u.description}{u.isSubscription && <span className="text-xs text-slate-400"> · Subscription</span>}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${n <= 3 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{label(n)}</span>
                  <span className="font-medium">{money(u.amount)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
