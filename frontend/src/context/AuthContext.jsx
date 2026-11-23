import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = (u, t) => {
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", t);
    setUser(u); setToken(t);
  };
  const updateUser = (u) => { localStorage.setItem("user", JSON.stringify(u)); setUser(u); };
  const logout = () => {
    localStorage.removeItem("user"); localStorage.removeItem("token");
    setUser(null); setToken(null);
  };

  return <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}
