# Expense Tracker (MERN)

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
npm run dev                 # http://localhost:5173
```

## Deploy
1. **Database:** MongoDB Atlas (free). Network Access > allow 0.0.0.0/0 for hosting.
2. **Backend on Render:** New Web Service > connect this repo > Root Directory `backend` > Build `npm install` > Start `npm start`. Env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL, set after step 3).
3. **Frontend on Vercel/Netlify:** Root Directory `frontend` > Build `npm run build` > Output `dist`. Env var: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
4. Update `CLIENT_URL` on Render to the final frontend URL and redeploy.

## API
`POST /api/user/signup` · `POST /api/user/login` · `GET /api/user/me` · `PUT /api/user/update` · `PUT /api/user/password`
`GET /api/dashboard?range=weekly|monthly|yearly|all`
`/api/income` and `/api/expense`: `GET /get` · `GET /overview?range=` · `GET /downloadexcel` · `POST /add` · `PUT /update/:id` · `DELETE /delete/:id`
