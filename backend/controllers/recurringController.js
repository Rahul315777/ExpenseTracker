const Recurring = require("../models/recurringModel");
const Wallet = require("../models/walletModel");
const Income = require("../models/incomeModel");
<<<<<<< HEAD
const Loan = require("../models/loanModel");
const { emisInRange } = require("../lib/loanMath");
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
const Expense = require("../models/expenseModel");

// ---- date helpers (UTC, because transaction dates are stored as UTC midnight) ----
const toDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

function nextDate(date, frequency, anchorDay) {
  if (frequency === "weekly") return addDays(date, 7);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (frequency === "yearly") return new Date(Date.UTC(y + 1, m, Math.min(anchorDay, daysInMonth(y + 1, m))));
  // monthly: keep the same day-of-month, clamped for shorter months (31st -> 30th/28th)
  const ny = new Date(Date.UTC(y, m + 1, 1)).getUTCFullYear();
  const nm = (m + 1) % 12;
  return new Date(Date.UTC(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm))));
}

const monthlyEquivalent = (amount, frequency) => (frequency === "weekly" ? (amount * 52) / 12 : frequency === "yearly" ? amount / 12 : amount);

// Creates the real income/expense entries for every due occurrence. Safe to call repeatedly:
// each occurrence is "claimed" atomically before it is created, so it can't be added twice.
async function processDue(userId) {
  const today = toDay(new Date());
  const rules = await Recurring.find({ userId, active: true, nextDue: { $lte: today } });
  let created = 0;
  for (const rule of rules) {
    let cur = rule.nextDue;
    let guard = 0;
    while (cur <= today && guard++ < 36) {
      const next = nextDate(cur, rule.frequency, rule.anchorDay);
      const claimed = await Recurring.findOneAndUpdate({ _id: rule._id, nextDue: cur, active: true }, { $set: { nextDue: next } });
      if (!claimed) break; // another request already handled this one
      const Model = rule.kind === "income" ? Income : Expense;
      await Model.create({
        userId, description: rule.description, amount: rule.amount, category: rule.category,
        date: cur, walletId: rule.walletId || null, recurringId: rule._id,
      });
      created++;
      cur = next;
    }
  }
  return created;
}

const validate = async (userId, b, creating) => {
  const { kind, description, amount, category, frequency, startDate, walletId } = b;
  if (creating && !["income", "expense"].includes(kind)) return "Choose income or expense";
  if (!description || !description.trim()) return "Description is required";
  if (!(Number(amount) > 0)) return "Amount must be greater than 0";
  if (!category) return "Category is required";
  if (!["weekly", "monthly", "yearly"].includes(frequency)) return "Choose how often it repeats";
  if (creating && (!startDate || Number.isNaN(new Date(startDate)))) return "Start date is required";
  if (walletId && !(await Wallet.exists({ _id: walletId, userId }))) return "Wallet not found";
  return null;
};

exports.list = async (req, res) => {
  try {
    await processDue(req.user._id);
    const rules = await Recurring.find({ userId: req.user._id }).sort({ active: -1, nextDue: 1 }).lean();
    const active = rules.filter((r) => r.active);
    const sum = (arr) => arr.reduce((a, r) => a + monthlyEquivalent(r.amount, r.frequency), 0);

    const today = toDay(new Date());
    const horizon = addDays(today, 30);
    const upcoming = [];
    active.forEach((r) => {
      let d = r.nextDue, n = 0;
      while (d <= horizon && n++ < 5) { upcoming.push({ ruleId: r._id, description: r.description, amount: r.amount, kind: r.kind, date: d, isSubscription: r.isSubscription }); d = nextDate(d, r.frequency, r.anchorDay); }
    });
<<<<<<< HEAD
    // unpaid loan EMIs in the next 30 days
    const loans = await Loan.find({ userId: req.user._id }).lean();
    loans.forEach((l) => emisInRange(l, today, addDays(horizon, 1)).forEach((r) => upcoming.push({ ruleId: null, description: `${l.name} EMI`, amount: r.emi, kind: "expense", date: r.date, isSubscription: false, isEmi: true })));
=======
>>>>>>> 7525cff1e806f97b1f5e95a17184ac1c7535f04f
    upcoming.sort((a, b) => a.date - b.date);

    res.json({
      success: true,
      data: {
        rules,
        summary: {
          monthlyExpense: sum(active.filter((r) => r.kind === "expense")),
          monthlyIncome: sum(active.filter((r) => r.kind === "income")),
          monthlySubscriptions: sum(active.filter((r) => r.kind === "expense" && r.isSubscription)),
          activeCount: active.length,
        },
        upcoming: upcoming.slice(0, 15),
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const err = await validate(req.user._id, req.body, true);
    if (err) return res.status(400).json({ success: false, message: err });
    const { kind, description, amount, category, frequency, startDate, walletId, isSubscription } = req.body;
    const start = toDay(new Date(startDate));
    const doc = await Recurring.create({
      userId: req.user._id, kind, description, amount: Number(amount), category, frequency,
      walletId: walletId || null, startDate: start, nextDue: start, anchorDay: start.getUTCDate(),
      isSubscription: kind === "expense" && !!isSubscription,
    });
    const created = await processDue(req.user._id); // adds today's / missed entries right away
    res.status(201).json({ success: true, message: created ? `Saved. ${created} entr${created === 1 ? "y" : "ies"} added to your transactions.` : "Saved", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const err = await validate(req.user._id, req.body, false);
    if (err) return res.status(400).json({ success: false, message: err });
    const { description, amount, category, frequency, walletId, isSubscription, active } = req.body;
    const rule = await Recurring.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: "Not found" });
    rule.description = description; rule.amount = Number(amount); rule.category = category;
    rule.walletId = walletId || null;
    if (frequency !== rule.frequency) rule.frequency = frequency;
    rule.isSubscription = rule.kind === "expense" && !!isSubscription;
    if (typeof active === "boolean") {
      // resuming never back-fills the paused period: jump to the next future occurrence
      if (active && !rule.active) {
        const today = toDay(new Date());
        while (rule.nextDue < today) rule.nextDue = nextDate(rule.nextDue, rule.frequency, rule.anchorDay);
      }
      rule.active = active;
    }
    await rule.save();
    res.json({ success: true, message: "Updated", data: rule });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Recurring.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted. Entries already added stay in your transactions." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.process = async (req, res) => {
  try { res.json({ success: true, created: await processDue(req.user._id) }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports._nextDate = nextDate; // exported for testing
exports._processDue = processDue;
