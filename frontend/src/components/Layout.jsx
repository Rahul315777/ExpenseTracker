import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, TrendingDown, Target, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../logo.png";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/income", label: "Income", icon: TrendingUp },
  { to: "/expense", label: "Expense", icon: TrendingDown },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const out = () => { logout(); nav("/login"); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 md:min-h-screen bg-white border-b md:border-r border-slate-200 p-4 flex md:flex-col gap-4">
        <div className="flex items-center gap-2 md:mb-4">
          <img src={logo} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-lg text-slate-800 hidden sm:block">ExpenseTracker</span>
        </div>
        <nav className="flex md:flex-col gap-1 flex-1 overflow-x-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block border-t border-slate-200 pt-3">
          <p className="text-sm font-semibold truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate mb-2">{user?.email}</p>
          <button onClick={out} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"><LogOut size={16} /> Logout</button>
        </div>
        <button onClick={out} className="md:hidden text-red-600 p-2" title="Logout"><LogOut size={18} /></button>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto"><Outlet /></main>
    </div>
  );
}
