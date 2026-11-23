# Expense Tracker (MERN)

A full-stack personal finance manager: track income and expenses, set budgets, manage wallets, plan savings goals and get insights from your own data.

**Stack:** React 19 + Vite + Tailwind v4 + Recharts (frontend) · Node.js + Express + MongoDB/Mongoose (backend) · JWT auth

## Features
- **Auth:** signup/login with JWT, profile and password change
- **Income & Expenses:** add/edit/delete, Excel export, search, filters, pagination, bulk actions
- **Dashboard:** totals, savings rate, charts, monthly comparison, spending trends (daily/weekly/monthly), upcoming payments
- **Budget Planner:** monthly limit per category with 80% / 100% alerts
- **Wallets:** cash/bank/UPI balances and money transfers
- **Recurring & Subscriptions:** automatic entries for rent, salary, EMIs, subscriptions
- **Savings Goals:** progress, monthly amount needed, add/withdraw history
- **Financial Calendar:** daily income/spend and upcoming dues
- **Quick Add:** type "Aaj 250 ka lunch kiya" and it becomes an expense (rule-based parser, English + Hinglish)
- **Smart Categories:** category suggestions that learn from your own history
- **Debt Manager:** money lent/borrowed, repayments, due dates and per-person balances
- **Smart Insights:** monthly report, unusual-expense detection and saving tips (rule-based, computed from your data)

## Run locally
### Backend
```bash
cd backend
npm install
copy .env.example .env      # Mac/Linux: cp .env.example .env
# fill MONGO_URI and JWT_SECRET in .env
npm run dev                 # http://localhost:4000
```
### Frontend (new terminal)
```bash
cd frontend
npm install
copy .env.example .env      # Mac/Linux: cp .env.example .env
npm run dev                 # http://localhost:5173
```

## Deploy
1. **Database:** MongoDB Atlas (free). Allow access from anywhere (0.0.0.0/0) for hosting.
2. **Backend (Render):** Root Directory `backend`, Build `npm install`, Start `npm start`. Env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL).
3. **Frontend (Vercel/Netlify):** Root Directory `frontend`, Build `npm run build`, Output `dist`. Env var: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.

Note: recurring entries are created when the app is opened (the free Render server sleeps, so there is no background scheduler).
