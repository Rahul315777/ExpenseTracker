const Expense = require("../models/expenseModel");
const Income = require("../models/incomeModel");
const Budget = require("../models/budgetModel");
const Recurring = require("../models/recurringModel");

// Rule-based insights computed from the user's own data (no external AI service).
const inr = (n) => "\u20B9" + Math.round(n).toLocaleString("en-IN");
const sum = (a) => a.reduce((s, x) => s + x.amount, 0);
const monthName = (d) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const pct = (a, b) => (b === 0 ? null : Math.round(((a - b) / b) * 100));

const byCategory = (arr) => {
  const m = {};
  arr.forEach((e) => { m[e.category] = m[e.category] || { category: e.category, amount: 0, count: 0 }; m[e.category].amount += e.amount; m[e.category].count++; });
  return Object.values(m).sort((a, b) => b.amount - a.amount);
};

function buildInsights({ start, expenses, incomes, prevExpenses, prevIncomes, baseline, budgets, recurring }) {
  const label = monthName(start);
  const prevLabel = monthName(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1)));
  const totalExpense = sum(expenses), totalIncome = sum(incomes);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : null;
  const prevExpense = sum(prevExpenses);
  const expenseChange = pct(totalExpense, prevExpense);
  const cats = byCategory(expenses).map((c) => ({ ...c, percent: totalExpense ? Math.round((c.amount / totalExpense) * 100) : 0 }));
  const biggest = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5).map((e) => ({ description: e.description, amount: e.amount, category: e.category, date: e.date }));
  const now = new Date();
  const sameMonth = now.getUTCFullYear() === start.getUTCFullYear() && now.getUTCMonth() === start.getUTCMonth();
  const daysElapsed = sameMonth ? now.getUTCDate() : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const perDay = totalExpense / Math.max(daysElapsed, 1);

  // ---- unusual expenses: far above the user's normal amount in that category ----
  const unusual = [];
  const baseBy = {};
  baseline.forEach((e) => { (baseBy[e.category] = baseBy[e.category] || []).push(e.amount); });
  expenses.forEach((e) => {
    const base = baseBy[e.category];
    if (!base || base.length < 5) return;
    const mean = base.reduce((a, b) => a + b, 0) / base.length;
    const std = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length);
    if (e.amount > mean + 2 * std && e.amount >= 1.5 * mean) unusual.push({ description: e.description, amount: e.amount, category: e.category, date: e.date, usual: mean, times: e.amount / mean });
  });
  unusual.sort((a, b) => b.times - a.times);

  // ---- suggestions ----
  const tips = [];
  if (!expenses.length) tips.push({ type: "tip", title: "Not enough data yet", text: `No expenses recorded for ${label}. Add your spending to get personalised tips.` });
  if (savingsRate !== null && expenses.length) {
    if (savingsRate < 0) tips.push({ type: "warning", title: "Spending is more than income", text: `You spent ${inr(-savings)} more than you earned in ${label}. Look at your top category first.` });
    else if (savingsRate < 20) tips.push({ type: "tip", title: "Savings rate is low", text: `You saved ${savingsRate}% of your income. A common target is 20%; that would be about ${inr(totalIncome * 0.2)} this month.` });
    else tips.push({ type: "good", title: "Healthy savings rate", text: `You saved ${savingsRate}% of your income (${inr(savings)}). Keep it up.` });
  }
  if (cats[0] && cats[0].percent >= 40 && cats.length > 1) tips.push({ type: "tip", title: `${cats[0].category} takes most of your money`, text: `${cats[0].category} is ${cats[0].percent}% of your spending (${inr(cats[0].amount)}). Even a 10% cut would save ${inr(cats[0].amount * 0.1)}.` });
  const spentBy = Object.fromEntries(cats.map((c) => [c.category, c.amount]));
  budgets.forEach((b) => {
    const spent = spentBy[b.category] || 0;
    if (spent > b.limit) tips.push({ type: "warning", title: `${b.category} budget exceeded`, text: `You spent ${inr(spent)} against a budget of ${inr(b.limit)} (${inr(spent - b.limit)} over).` });
  });
  const subs = recurring.filter((r) => r.kind === "expense" && r.isSubscription);
  if (subs.length) {
    const monthly = subs.reduce((a, r) => a + (r.frequency === "weekly" ? (r.amount * 52) / 12 : r.frequency === "yearly" ? r.amount / 12 : r.amount), 0);
    tips.push({ type: "tip", title: "Review your subscriptions", text: `You have ${subs.length} active subscription${subs.length > 1 ? "s" : ""} costing about ${inr(monthly)} a month (${inr(monthly * 12)} a year). Cancel any you don't use.` });
  }
  const prevCats = Object.fromEntries(byCategory(prevExpenses).map((c) => [c.category, c.amount]));
  const rises = cats.map((c) => ({ ...c, rise: c.amount - (prevCats[c.category] || 0), before: prevCats[c.category] || 0 })).filter((c) => c.before > 0 && c.rise >= 500 && c.amount >= c.before * 1.3).sort((a, b) => b.rise - a.rise);
  if (rises[0]) tips.push({ type: "warning", title: `${rises[0].category} spending jumped`, text: `${rises[0].category} is up ${inr(rises[0].rise)} (${pct(rises[0].amount, rises[0].before)}%) compared with ${prevLabel}.` });
  const small = cats.find((c) => c.count >= 8 && c.amount / c.count < 200);
  if (small) tips.push({ type: "tip", title: "Small purchases add up", text: `${small.count} ${small.category} purchases averaging ${inr(small.amount / small.count)} added up to ${inr(small.amount)}.` });
  if (expenseChange !== null && expenseChange <= -10 && prevExpense > 0) tips.push({ type: "good", title: "Spending is down", text: `You spent ${Math.abs(expenseChange)}% less than ${prevLabel} (${inr(prevExpense - totalExpense)} less).` });

  // ---- report text ----
  let text;
  if (!expenses.length && !incomes.length) text = `No transactions were recorded for ${label}.`;
  else {
    const parts = [`In ${label} you earned ${inr(totalIncome)} and spent ${inr(totalExpense)} across ${expenses.length} expense${expenses.length === 1 ? "" : "s"}${savingsRate !== null ? `, which left ${inr(savings)} (${savingsRate}% of income)` : ""}.`];
    if (cats[0]) parts.push(`Your biggest category was ${cats[0].category} at ${inr(cats[0].amount)} (${cats[0].percent}% of spending).`);
    if (biggest[0]) parts.push(`Your largest single expense was "${biggest[0].description}" for ${inr(biggest[0].amount)} on ${dayName(biggest[0].date)}.`);
    if (expenses.length) parts.push(`That is about ${inr(perDay)} per day.`);
    if (expenseChange !== null) parts.push(`Compared with ${prevLabel}, your spending is ${expenseChange === 0 ? "the same" : `${Math.abs(expenseChange)}% ${expenseChange > 0 ? "higher" : "lower"}`}.`);
    text = parts.join(" ");
  }

  return {
    month: label, hasData: expenses.length + incomes.length > 0,
    stats: { totalIncome, totalExpense, savings, savingsRate, expenseChange, transactions: expenses.length, perDay },
    categories: cats.slice(0, 6), biggest, unusual: unusual.slice(0, 5), suggestions: tips, report: text,
  };
}

exports.get = async (req, res) => {
  try {
    const now = new Date();
    const param = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || "") ? req.query.month : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const y = Number(param.slice(0, 4)), m = Number(param.slice(5, 7)) - 1;
    const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 1));
    const prevStart = new Date(Date.UTC(y, m - 1, 1));
    const baseStart = new Date(start.getTime() - 180 * 86400000);
    const uid = req.user._id;

    const [exps, incs, budgets, recurring] = await Promise.all([
      Expense.find({ userId: uid, date: { $gte: baseStart < prevStart ? baseStart : prevStart, $lt: end } }).lean(),
      Income.find({ userId: uid, date: { $gte: prevStart, $lt: end } }).lean(),
      Budget.find({ userId: uid }).lean(),
      Recurring.find({ userId: uid, active: true }).lean(),
    ]);
    const data = buildInsights({
      start,
      expenses: exps.filter((e) => e.date >= start),
      incomes: incs.filter((e) => e.date >= start),
      prevExpenses: exps.filter((e) => e.date >= prevStart && e.date < start),
      prevIncomes: incs.filter((e) => e.date >= prevStart && e.date < start),
      baseline: exps.filter((e) => e.date >= baseStart && e.date < start),
      budgets, recurring,
    });
    res.json({ success: true, data: { ...data, monthKey: param } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports._buildInsights = buildInsights;
