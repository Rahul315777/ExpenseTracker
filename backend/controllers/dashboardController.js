const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");
const { getRange } = require("../utils");

exports.getDashboard = async (req, res) => {
  try {
    const { start, end } = getRange(req.query.range || "monthly");
    const q = { userId: req.user._id, date: { $gte: start, $lte: end } };
    const [incomes, expenses] = await Promise.all([Income.find(q).lean(), Expense.find(q).lean()]);
    const totalIncome = incomes.reduce((a, c) => a + c.amount, 0);
    const totalExpense = expenses.reduce((a, c) => a + c.amount, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome === 0 ? 0 : Math.round((savings / totalIncome) * 100);

    const recent = [
      ...incomes.map((i) => ({ ...i, type: "income" })),
      ...expenses.map((e) => ({ ...e, type: "expense" })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

    const byCat = {};
    expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const expenseDistribution = Object.entries(byCat).map(([category, amount]) => ({
      category, amount, percent: totalExpense ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    const days = {};
    const key = (d) => new Date(d).toISOString().slice(0, 10);
    incomes.forEach((i) => { const k = key(i.date); days[k] = days[k] || { date: k, income: 0, expense: 0 }; days[k].income += i.amount; });
    expenses.forEach((e) => { const k = key(e.date); days[k] = days[k] || { date: k, income: 0, expense: 0 }; days[k].expense += e.amount; });
    const trend = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data: { totalIncome, totalExpense, savings, savingsRate, recent, expenseDistribution, trend } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
