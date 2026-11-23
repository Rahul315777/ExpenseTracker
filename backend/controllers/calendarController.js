const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");
const Recurring = require("../models/recurringModel");
<<<<<<< HEAD
const Loan = require("../models/loanModel");
const { emisInRange } = require("../lib/loanMath");
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
const { _nextDate: nextDate } = require("./recurringController");

const iso = (d) => d.toISOString().slice(0, 10);

// GET /calendar/month?month=YYYY-MM  -> what happened on each day + payments that are coming up
exports.month = async (req, res) => {
  try {
    const now = new Date();
    const param = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || "") ? req.query.month : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const y = Number(param.slice(0, 4)), m = Number(param.slice(5, 7)) - 1;
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 1));

    const q = { userId: req.user._id, date: { $gte: start, $lt: end } };
<<<<<<< HEAD
    const [incomes, expenses, rules, loans] = await Promise.all([
      Income.find(q).sort({ createdAt: 1 }).lean(),
      Expense.find(q).sort({ createdAt: 1 }).lean(),
      Recurring.find({ userId: req.user._id, active: true }).lean(),
      Loan.find({ userId: req.user._id }).lean(),
=======
    const [incomes, expenses, rules] = await Promise.all([
      Income.find(q).sort({ createdAt: 1 }).lean(),
      Expense.find(q).sort({ createdAt: 1 }).lean(),
      Recurring.find({ userId: req.user._id, active: true }).lean(),
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
    ]);

    const days = {};
    const day = (d) => (days[iso(d)] = days[iso(d)] || { date: iso(d), income: 0, expense: 0, items: [] });
    incomes.forEach((i) => { const d = day(i.date); d.income += i.amount; d.items.push({ _id: i._id, type: "income", description: i.description, amount: i.amount, category: i.category, auto: !!i.recurringId }); });
    expenses.forEach((e) => { const d = day(e.date); d.expense += e.amount; d.items.push({ _id: e._id, type: "expense", description: e.description, amount: e.amount, category: e.category, auto: !!e.recurringId }); });

    // payments that will be added automatically later this month
    const due = [];
    rules.forEach((r) => {
      let d = r.nextDue, n = 0;
      while (d < end && n++ < 60) {
        if (d >= start) due.push({ ruleId: r._id, date: iso(d), description: r.description, amount: r.amount, kind: r.kind, isSubscription: r.isSubscription });
        d = nextDate(d, r.frequency, r.anchorDay);
      }
    });
<<<<<<< HEAD
    // unpaid loan EMIs falling in this month
    loans.forEach((l) => emisInRange(l, start, end).forEach((r) => due.push({ ruleId: null, date: iso(r.date), description: `${l.name} EMI`, amount: r.emi, kind: "expense", isSubscription: false, isEmi: true })));
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
    due.sort((a, b) => a.date.localeCompare(b.date));

    const sum = (arr) => arr.reduce((a, c) => a + c.amount, 0);
    res.json({
      success: true,
      data: {
        month: param,
        days,
        due,
        totals: {
          income: sum(incomes), expense: sum(expenses),
          upcomingExpense: sum(due.filter((x) => x.kind === "expense")),
          upcomingIncome: sum(due.filter((x) => x.kind === "income")),
        },
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
