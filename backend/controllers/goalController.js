const Goal = require("../models/goalModel");

const DAY = 86400000;
const toDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// turns a goal document into what the UI needs (saved, progress, "how much per month", ...)
function present(g) {
  const saved = (g.contributions || []).reduce((a, c) => a + c.amount, 0);
  const remaining = Math.max(g.targetAmount - saved, 0);
  const completed = saved >= g.targetAmount;
  const out = {
    _id: g._id, name: g.name, targetAmount: g.targetAmount, targetDate: g.targetDate || null,
    saved, remaining, completed, percent: Math.round((saved / g.targetAmount) * 100),
    contributions: [...(g.contributions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
    contributionCount: (g.contributions || []).length,
    daysLeft: null, overdue: false, perMonth: null,
  };
  if (g.targetDate && !completed) {
    const daysLeft = Math.ceil((toDay(new Date(g.targetDate)) - toDay(new Date())) / DAY);
    out.daysLeft = daysLeft;
    if (daysLeft <= 0) out.overdue = true;
    else out.perMonth = remaining / Math.max(Math.ceil(daysLeft / 30.44), 1);
  }
  return out;
}

const check = (b) => {
  if (!b.name || !b.name.trim()) return "Goal name is required";
  if (!(Number(b.targetAmount) >= 1)) return "Target amount must be at least 1";
  if (b.targetDate && Number.isNaN(new Date(b.targetDate))) return "Invalid target date";
  return null;
};

exports.list = async (req, res) => {
  try {
    const goals = (await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()).map(present);
    goals.sort((a, b) => Number(a.completed) - Number(b.completed)); // unfinished goals first
    res.json({
      success: true,
      data: {
        goals,
        summary: {
          count: goals.length,
          completed: goals.filter((g) => g.completed).length,
          totalSaved: goals.reduce((a, g) => a + g.saved, 0),
          totalTarget: goals.reduce((a, g) => a + g.targetAmount, 0),
        },
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const { name, targetAmount, targetDate } = req.body;
    const doc = await Goal.create({ userId: req.user._id, name, targetAmount: Number(targetAmount), targetDate: targetDate || null });
    res.status(201).json({ success: true, message: "Goal created", data: present(doc.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const { name, targetAmount, targetDate } = req.body;
    const doc = await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { name, targetAmount: Number(targetAmount), targetDate: targetDate || null }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: "Goal not found" });
    res.json({ success: true, message: "Goal updated", data: present(doc.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Goal not found" });
    res.json({ success: true, message: "Goal deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// add money (positive) or take money out (negative)
exports.contribute = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || Number.isNaN(amount)) return res.status(400).json({ success: false, message: "Enter an amount (use a minus sign to withdraw)" });
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });
    const saved = goal.contributions.reduce((a, c) => a + c.amount, 0);
    if (saved + amount < 0) return res.status(400).json({ success: false, message: `You can't take out more than what is saved (${saved})` });
    goal.contributions.push({ amount, note: req.body.note || "", date: req.body.date || new Date() });
    await goal.save();
    const p = present(goal.toObject());
    res.json({ success: true, message: p.completed && saved < goal.targetAmount ? "🎉 Goal reached!" : amount > 0 ? "Money added" : "Money withdrawn", data: p });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.removeContribution = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });
    const c = goal.contributions.id(req.params.cid);
    if (!c) return res.status(404).json({ success: false, message: "Entry not found" });
    const saved = goal.contributions.reduce((a, x) => a + x.amount, 0);
    if (saved - c.amount < 0) return res.status(400).json({ success: false, message: "Removing this entry would make the saved amount negative" });
    c.deleteOne();
    await goal.save();
    res.json({ success: true, message: "Entry removed", data: present(goal.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports._present = present;
