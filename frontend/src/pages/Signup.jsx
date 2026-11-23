import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../logo.png";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const cls = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400";

  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { data } = await api.post("/user/signup", form);
      login(data.user, data.token); nav("/");
    } catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-slate-100">
      <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-8 space-y-4">
        <div className="text-center"><img src={logo} alt="" className="h-14 w-14 rounded-xl mx-auto mb-2 object-cover" /><h1 className="text-2xl font-bold">Create account</h1><p className="text-sm text-slate-500">Start tracking in a minute</p></div>
        {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded-lg">{error}</div>}
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} />
        <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cls} />
        <input type="password" required minLength={6} placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={cls} />
        <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg disabled:opacity-60">{loading ? "Creating..." : "Sign up"}</button>
        <p className="text-sm text-center text-slate-600">Already have an account? <Link to="/login" className="text-emerald-700 font-medium">Login</Link></p>
      </form>
    </div>
  );
}
