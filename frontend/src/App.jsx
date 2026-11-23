import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Profile from "./pages/Profile.jsx";
import Budgets from "./pages/Budgets.jsx";
import Wallets from "./pages/Wallets.jsx";
import Recurring from "./pages/Recurring.jsx";
import Goals from "./pages/Goals.jsx";
import Calendar from "./pages/Calendar.jsx";
import Insights from "./pages/Insights.jsx";
<<<<<<< HEAD
import Debts from "./pages/Debts.jsx";
import Loans from "./pages/Loans.jsx";
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
function Public({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/signup" element={<Public><Signup /></Public>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="income" element={<Transactions kind="income" />} />
        <Route path="expense" element={<Transactions kind="expense" />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="goals" element={<Goals />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="insights" element={<Insights />} />
<<<<<<< HEAD
        <Route path="debts" element={<Debts />} />
        <Route path="loans" element={<Loans />} />
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
