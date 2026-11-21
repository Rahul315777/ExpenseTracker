const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");

// All bucketing is done in UTC, because transaction dates are stored as UTC midnight of the chosen day.
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const monday = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));
const pct = (now, before) => (before === 0 ? (now === 0 ? 0 : null) : Math.round(((now - before) / before) * 100));
const fmt = (d, opts) => d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

exports.comparison = async (req, res) => {
  try {
    const now = new Date();
    const y = now.getUTCFullYear(), m = now.getUTCMonth();
    const thisStart = new Date(Date.UTC(y, m, 1));
    const lastStart = new Date(Date.UTC(y, m - 1, 1));
    const nextStart = new Date(Date.UTC(y, m + 1, 1));
    const q = { userId: req.user._id, date: { $gte: lastStart, $lt: nextStart } };
    const [incomes, expenses] = await Promise.all([Income.find(q).lean(), Expense.find(q).lean()]);

    const sum = (arr, which) => arr.filter((x) => (x.date >= thisStart) === (which === "this")).reduce((a, c) => a + c.amount, 0);
    const month = (which, start) => {
      const income = sum(incomes, which), expense = sum(expenses, which);
      return { label: fmt(start, { month: "long", year: "numeric" }), income, expense, savings: income - expense };
    };
    const thisMonth = month("this", thisStart), lastMonth = month("last", lastStart);

    const cat = {};
    expenses.forEach((e) => {
      cat[e.category] = cat[e.category] || { category: e.category, thisMonth: 0, lastMonth: 0 };
      cat[e.category][e.date >= thisStart ? "thisMonth" : "lastMonth"] += e.amount;
    });
    const categories = Object.values(cat)
      .map((c) => ({ ...c, change: pct(c.thisMonth, c.lastMonth) }))
      .sort((a, b) => b.thisMonth + b.lastMonth - (a.thisMonth + a.lastMonth))
      .slice(0, 8);

    res.json({
      success: true,
      data: { thisMonth, lastMonth, expenseChange: pct(thisMonth.expense, lastMonth.expense), incomeChange: pct(thisMonth.income, lastMonth.income), categories },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.trends = async (req, res) => {
  try {
    const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "daily";
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

    // build the list of buckets first so empty periods show as zero
    let buckets = [], keyOf;
    if (period === "daily") {
      for (let i = 29; i >= 0; i--) { const d = addDays(today, -i); buckets.push({ key: iso(d), label: fmt(d, { day: "numeric", month: "short" }), start: d }); }
      keyOf = (d) => iso(d);
    } else if (period === "weekly") {
      for (let i = 11; i >= 0; i--) { const d = addDays(monday(today), -7 * i); buckets.push({ key: iso(d), label: fmt(d, { day: "numeric", month: "short" }), start: d }); }
      keyOf = (d) => iso(monday(d));
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
        buckets.push({ key: iso(d).slice(0, 7), label: fmt(d, { month: "short", year: "2-digit" }), start: d });
      }
      keyOf = (d) => iso(d).slice(0, 7);
    }

    const q = { userId: req.user._id, date: { $gte: buckets[0].start, $lt: addDays(today, 1) } };
    const [incomes, expenses] = await Promise.all([Income.find(q).lean(), Expense.find(q).lean()]);

    const map = new Map(buckets.map((b) => [b.key, { label: b.label, income: 0, expense: 0 }]));
    incomes.forEach((i) => { const b = map.get(keyOf(i.date)); if (b) b.income += i.amount; });
    expenses.forEach((e) => { const b = map.get(keyOf(e.date)); if (b) b.expense += e.amount; });

    const points = [...map.values()];
    const totalExpense = points.reduce((a, p) => a + p.expense, 0);
    const totalIncome = points.reduce((a, p) => a + p.income, 0);
    res.json({ success: true, data: { period, points, totalIncome, totalExpense, avgExpense: totalExpense / points.length } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
