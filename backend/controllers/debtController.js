const Debt = require("../models/debtModel");

const DAY = 86400000;
const toDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

function present(d) {
  const paid = (d.payments || []).reduce((a, p) => a + p.amount, 0);
  const remaining = Math.max(d.amount - paid, 0);
  const settled = remaining <= 0;
  let daysToDue = null, overdue = false;
  if (d.dueDate && !settled) {
    daysToDue = Math.round((toDay(new Date(d.dueDate)) - toDay(new Date())) / DAY);
    overdue = daysToDue < 0;
  }
  return {
    _id: d._id, person: d.person, direction: d.direction, amount: d.amount, note: d.note || "", date: d.date, dueDate: d.dueDate || null,
    paid, remaining, settled, percent: Math.round((paid / d.amount) * 100), daysToDue, overdue,
    payments: [...(d.payments || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
    paymentCount: (d.payments || []).length,
  };
}

const check = (b) => {
  if (!b.person || !b.person.trim()) return "Person's name is required";
  if (!["lent", "borrowed"].includes(b.direction)) return "Choose whether you lent or borrowed";
  if (!(Number(b.amount) >= 1)) return "Amount must be at least 1";
  if (!b.date || Number.isNaN(new Date(b.date))) return "Date is required";
  if (b.dueDate && Number.isNaN(new Date(b.dueDate))) return "Invalid due date";
  return null;
};

exports.list = async (req, res) => {
  try {
    const debts = (await Debt.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()).map(present);
    // unsettled first, then overdue/soonest due, then newest
    debts.sort((a, b) => Number(a.settled) - Number(b.settled) || Number(b.overdue) - Number(a.overdue) || (a.daysToDue ?? 1e9) - (b.daysToDue ?? 1e9));

    const open = debts.filter((d) => !d.settled);
    const toReceive = open.filter((d) => d.direction === "lent").reduce((a, d) => a + d.remaining, 0);
    const toPay = open.filter((d) => d.direction === "borrowed").reduce((a, d) => a + d.remaining, 0);

    // net balance per person (positive = they owe you)
    const map = {};
    open.forEach((d) => {
      const key = d.person.trim().toLowerCase();
      map[key] = map[key] || { person: d.person.trim(), net: 0, count: 0 };
      map[key].net += d.direction === "lent" ? d.remaining : -d.remaining;
      map[key].count++;
    });
    const people = Object.values(map).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    res.json({ success: true, data: { debts, people, summary: { toReceive, toPay, net: toReceive - toPay, overdue: open.filter((d) => d.overdue).length, openCount: open.length } } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const { person, direction, amount, note, date, dueDate } = req.body;
    const doc = await Debt.create({ userId: req.user._id, person, direction, amount: Number(amount), note, date, dueDate: dueDate || null });
    res.status(201).json({ success: true, message: "Saved", data: present(doc.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ success: false, message: "Not found" });
    const paid = debt.payments.reduce((a, p) => a + p.amount, 0);
    if (Number(req.body.amount) < paid) return res.status(400).json({ success: false, message: `Amount can't be less than what is already paid back (${paid})` });
    const { person, direction, amount, note, date, dueDate } = req.body;
    Object.assign(debt, { person, direction, amount: Number(amount), note, date, dueDate: dueDate || null });
    await debt.save();
    res.json({ success: true, message: "Updated", data: present(debt.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// record a repayment (partial or full)
exports.addPayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ success: false, message: "Enter an amount greater than 0" });
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ success: false, message: "Not found" });
    const paid = debt.payments.reduce((a, p) => a + p.amount, 0);
    const remaining = debt.amount - paid;
    if (amount > remaining + 1e-9) return res.status(400).json({ success: false, message: `Only ${remaining} is left to pay` });
    debt.payments.push({ amount, note: req.body.note || "", date: req.body.date || new Date() });
    await debt.save();
    const p = present(debt.toObject());
    res.json({ success: true, message: p.settled ? "Fully settled 🎉" : "Payment recorded", data: p });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.removePayment = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ success: false, message: "Not found" });
    const pay = debt.payments.id(req.params.pid);
    if (!pay) return res.status(404).json({ success: false, message: "Payment not found" });
    pay.deleteOne();
    await debt.save();
    res.json({ success: true, message: "Payment removed", data: present(debt.toObject()) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports._present = present;
