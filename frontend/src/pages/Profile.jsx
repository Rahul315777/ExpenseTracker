import { useState } from "react";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [info, setInfo] = useState({ name: user?.name || "", email: user?.email || "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const cls = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400";
  const show = (type, text) => setMsg({ type, text });

  const saveInfo = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put("/user/update", info); updateUser(data.user); show("ok", "Profile updated"); }
    catch (err) { show("err", errMsg(err)); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api.put("/user/password", pw); setPw({ currentPassword: "", newPassword: "" }); show("ok", "Password changed"); }
    catch (err) { show("err", errMsg(err)); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Profile</h1>
      {msg.text && <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
      <form onSubmit={saveInfo} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">Account details</h2>
        <input required value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Name" className={cls} />
        <input required type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="Email" className={cls} />
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg">Save changes</button>
      </form>
      <form onSubmit={savePw} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <input required type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} placeholder="Current password" className={cls} />
        <input required type="password" minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="New password (min 6 characters)" className={cls} />
        <button className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg">Update password</button>
      </form>
    </div>
  );
}
