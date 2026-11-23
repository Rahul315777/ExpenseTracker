# Expense Tracker (MERN)

<<<<<<< HEAD
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
- **Loans & EMI:** EMI calculator (reducing balance), full payment schedule, outstanding balance, EMI reminders
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
=======
Full-stack expense tracker: signup/login (JWT), income & expense CRUD, dashboard charts, category breakdown, date-range filters, Excel export, profile settings.

**Stack:** React 19 + Vite + Tailwind v4 + Recharts (frontend) · Node + Express + MongoDB/Mongoose (backend)

## Run locally

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env      # Windows (Mac/Linux: cp .env.example .env)
# open .env and fill MONGO_URI + JWT_SECRET
npm run dev                 # runs on http://localhost:4000
```
Get a free `MONGO_URI` from MongoDB Atlas (Database > Connect > Drivers). Allow your IP under Network Access.

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
copy .env.example .env      # Windows (Mac/Linux: cp .env.example .env)
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
npm run dev                 # http://localhost:5173
```

## Deploy
<<<<<<< HEAD
1. **Database:** MongoDB Atlas (free). Allow access from anywhere (0.0.0.0/0) for hosting.
2. **Backend (Render):** Root Directory `backend`, Build `npm install`, Start `npm start`. Env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL).
3. **Frontend (Vercel/Netlify):** Root Directory `frontend`, Build `npm run build`, Output `dist`. Env var: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.

Note: recurring entries are created when the app is opened (the free Render server sleeps, so there is no background scheduler).
=======
1. **Database:** MongoDB Atlas (free). Network Access > allow 0.0.0.0/0 for hosting.
2. **Backend on Render:** New Web Service > connect this repo > Root Directory `backend` > Build `npm install` > Start `npm start`. Env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL, set after step 3).
3. **Frontend on Vercel/Netlify:** Root Directory `frontend` > Build `npm run build` > Output `dist`. Env var: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
4. Update `CLIENT_URL` on Render to the final frontend URL and redeploy.

## API
`POST /api/user/signup` · `POST /api/user/login` · `GET /api/user/me` · `PUT /api/user/update` · `PUT /api/user/password`
`GET /api/dashboard?range=weekly|monthly|yearly|all`
`/api/income` and `/api/expense`: `GET /get` · `GET /overview?range=` · `GET /downloadexcel` · `POST /add` · `PUT /update/:id` · `DELETE /delete/:id`
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
