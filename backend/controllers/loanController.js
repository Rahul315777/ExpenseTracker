const Loan = require("../models/loanModel");
const { summarize } = require("../lib/loanMath");

const check = (b) => {
  if (!b.name || !b.name.trim()) return "Loan name is required";
  if (!(Number(b.principal) >= 1)) return "Loan amount must be at least 1";
  const rate = Number(b.annualRate);
  if (b.annualRate === "" || b.annualRate === undefined || Number.isNaN(rate) || rate < 0 || rate > 60) return "Interest rate must be between 0 and 60% per year";
  const n = Number(b.tenureMonths);
  if (!Number.isInteger(n) || n < 1 || n > 480) return "Tenure must be a whole number of months (1 to 480)";
  if (!b.firstEmiDate || Number.isNaN(new Date(b.firstEmiDate))) return "First EMI date is required";
  return null;
};

const view = (loan, withSchedule) => {
  const s = summarize({ principal: loan.principal, annualRate: loan.annualRate, tenureMonths: loan.tenureMonths, firstEmiDate: loan.firstEmiDate, paid: loan.paid });
  const { schedule, ...rest } = s;
  return { _id: loan._id, name: loan.name, lender: loan.lender, principal: loan.principal, annualRate: loan.annualRate, tenureMonths: loan.tenureMonths, firstEmiDate: loan.firstEmiDate, ...rest, ...(withSchedule ? { schedule } : {}) };
};

exports.list = async (req, res) => {
  try {
    const loans = (await Loan.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()).map((l) => view(l, false));
    loans.sort((a, b) => Number(a.closed) - Number(b.closed));
    const open = loans.filter((l) => !l.closed);
    const dues = open.map((l) => l.nextEmi).filter(Boolean).sort((a, b) => a.date - b.date);
    res.json({
      success: true,
      data: {
        loans,
        summary: {
          outstanding: open.reduce((a, l) => a + l.outstanding, 0),
          monthlyEmi: open.reduce((a, l) => a + l.emi, 0),
          overdue: open.reduce((a, l) => a + l.overdueCount, 0),
          nextDue: dues[0] || null,
          openCount: open.length,
        },
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.get = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    res.json({ success: true, data: view(loan, true) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const { name, lender, principal, annualRate, tenureMonths, firstEmiDate } = req.body;
    const already = Math.floor(Number(req.body.alreadyPaid) || 0);
    if (already < 0 || already > Number(tenureMonths)) return res.status(400).json({ success: false, message: "EMIs already paid can't be more than the tenure" });
    const paid = Array.from({ length: already }, (_, i) => ({ installment: i + 1, paidOn: new Date() }));
    const doc = await Loan.create({ userId: req.user._id, name, lender, principal: Number(principal), annualRate: Number(annualRate), tenureMonths: Number(tenureMonths), firstEmiDate, paid });
    res.status(201).json({ success: true, message: "Loan added", data: view(doc.toObject(), false) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const err = check(req.body);
    if (err) return res.status(400).json({ success: false, message: err });
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    const { name, lender, principal, annualRate, tenureMonths, firstEmiDate } = req.body;
    Object.assign(loan, { name, lender, principal: Number(principal), annualRate: Number(annualRate), tenureMonths: Number(tenureMonths), firstEmiDate });
    loan.paid = loan.paid.filter((p) => p.installment <= loan.tenureMonths);
    await loan.save();
    res.json({ success: true, message: "Loan updated", data: view(loan.toObject(), false) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Loan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Loan not found" });
    res.json({ success: true, message: "Loan deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// mark one EMI as paid (or undo it)
exports.setPaid = async (req, res) => {
  try {
    const n = Number(req.body.installment);
    const paid = req.body.paid !== false;
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    if (!Number.isInteger(n) || n < 1 || n > loan.tenureMonths) return res.status(400).json({ success: false, message: "Invalid installment number" });
    const has = loan.paid.some((p) => p.installment === n);
    if (paid && !has) loan.paid.push({ installment: n, paidOn: new Date() });
    if (!paid && has) loan.paid = loan.paid.filter((p) => p.installment !== n);
    await loan.save();
    res.json({ success: true, message: paid ? `EMI ${n} marked as paid` : `EMI ${n} marked as unpaid`, data: view(loan.toObject(), true) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
