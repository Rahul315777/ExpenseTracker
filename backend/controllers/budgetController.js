const Budget = require("../models/budgetModel");
const Expense = require("../models/expenseModel");

const statusOf = (percent) => (percent >= 100 ? "exceeded" : percent >= 80 ? "warning" : "ok");

// month format: YYYY-MM (defaults to current month)
const monthRange = (month) => {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth();
  if (/^\d{4}-\d{2}$/.test(month || "")) { y = Number(month.slice(0, 4)); m = Number(month.slice(5, 7)) - 1; }
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999), label: `${y}-${String(m + 1).padStart(2, "0")}` };
};

exports.getBudgets = async (req, res) => {
  try {
    const { start, end, label } = monthRange(req.query.month);
    const [budgets, expenses] = await Promise.all([
      Budget.find({ userId: req.user._id }).sort({ category: 1 }).lean(),
      Expense.find({ userId: req.user._id, date: { $gte: start, $lte: end } }).lean(),
    ]);
    const spentBy = {};
    expenses.forEach((e) => { spentBy[e.category] = (spentBy[e.category] || 0) + e.amount; });

    const items = budgets.map((b) => {
      const spent = spentBy[b.category] || 0;
      const percent = Math.round((spent / b.limit) * 100);
      return { _id: b._id, category: b.category, limit: b.limit, spent, remaining: b.limit - spent, percent, status: statusOf(percent) };
    });

    const totalBudget = items.reduce((a, c) => a + c.limit, 0);
    const totalSpent = items.reduce((a, c) => a + c.spent, 0);
    const budgeted = new Set(budgets.map((b) => b.category));
    const unbudgeted = Object.entries(spentBy).filter(([c]) => !budgeted.has(c)).map(([category, spent]) => ({ category, spent }));

    res.json({
      success: true,
      data: {
        month: label,
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        alerts: items.filter((i) => i.status !== "ok").length,
        items,
        unbudgeted,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.setBudget = async (req, res) => {
  try {
    const { category, limit } = req.body;
    if (!category || !limit || Number(limit) <= 0) return res.status(400).json({ success: false, message: "Category and a limit greater than 0 are required" });
    const doc = await Budget.findOneAndUpdate(
      { userId: req.user._id, category },
      { limit: Number(limit) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: "Budget saved", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteBudget = async (req, res) => {
  try {
    const doc = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Budget not found" });
    res.json({ success: true, message: "Budget deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
