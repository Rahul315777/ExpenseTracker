const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const { getRange } = require("../utils");
const Wallet = require("../models/walletModel");

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SORTS = { date_desc: { date: -1, createdAt: -1 }, date_asc: { date: 1, createdAt: 1 }, amount_desc: { amount: -1 }, amount_asc: { amount: 1 } };

// returns wallet _id (or null if none given); false if the wallet is not the user's
const resolveWallet = async (userId, walletId) => {
  if (!walletId) return null;
  const w = await Wallet.findOne({ _id: walletId, userId }).select("_id");
  return w ? w._id : false;
};

// Factory: builds CRUD + overview + excel handlers for a model (Income or Expense)
module.exports = (Model, label) => ({
  add: async (req, res) => {
    try {
      const { description, amount, category, date, walletId } = req.body;
      if (!description || amount === undefined || amount === "" || !category || !date)
        return res.status(400).json({ success: false, message: "description, amount, category and date are required" });
      if (Number.isNaN(Number(amount)) || Number(amount) < 0) return res.status(400).json({ success: false, message: "Amount must be a positive number" });
      const wid = await resolveWallet(req.user._id, walletId);
      if (wid === false) return res.status(400).json({ success: false, message: "Wallet not found" });
      const doc = await Model.create({ userId: req.user._id, description, amount: Number(amount), category, date, walletId: wid });
      res.status(201).json({ success: true, message: `${label} added`, data: doc });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  search: async (req, res) => {
    try {
      const { q, category, walletId, minAmount, maxAmount, from, to, sort } = req.query;
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
      const filter = { userId: req.user._id };

      if (q && q.trim()) filter.description = { $regex: escapeRegex(q.trim()), $options: "i" };
      if (category) filter.category = category;
      if (walletId === "none") filter.walletId = null;
      else if (walletId) {
        if (!mongoose.isValidObjectId(walletId)) return res.status(400).json({ success: false, message: "Invalid wallet" });
        filter.walletId = new mongoose.Types.ObjectId(walletId);
      }
      const amt = {};
      if (minAmount !== undefined && minAmount !== "" && !Number.isNaN(Number(minAmount))) amt.$gte = Number(minAmount);
      if (maxAmount !== undefined && maxAmount !== "" && !Number.isNaN(Number(maxAmount))) amt.$lte = Number(maxAmount);
      if (Object.keys(amt).length) filter.amount = amt;
      const dt = {};
      if (from && !Number.isNaN(new Date(from))) dt.$gte = new Date(from);
      if (to && !Number.isNaN(new Date(to))) { const d = new Date(to); d.setUTCHours(23, 59, 59, 999); dt.$lte = d; }
      if (Object.keys(dt).length) filter.date = dt;

      const [total, items, sum] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter).sort(SORTS[sort] || SORTS.date_desc).skip((page - 1) * limit).limit(limit).lean(),
        Model.aggregate([{ $match: filter }, { $group: { _id: null, t: { $sum: "$amount" } } }]),
      ]);
      res.json({ success: true, data: { items, total, page, pages: Math.max(Math.ceil(total / limit), 1), limit, totalAmount: sum[0]?.t || 0 } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  getAll: async (req, res) => {
    try {
      const data = await Model.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  update: async (req, res) => {
    try {
      const { description, amount, category, date, walletId } = req.body;
      const wid = await resolveWallet(req.user._id, walletId);
      if (wid === false) return res.status(400).json({ success: false, message: "Wallet not found" });
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { description, amount: Number(amount), category, date, walletId: wid },
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, message: `${label} updated`, data: doc });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  remove: async (req, res) => {
    try {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
      if (!doc) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, message: `${label} deleted` });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  overview: async (req, res) => {
    try {
      const { start, end } = getRange(req.query.range);
      const items = await Model.find({ userId: req.user._id, date: { $gte: start, $lte: end } }).sort({ date: -1 });
      const total = items.reduce((a, c) => a + c.amount, 0);
      const byCat = {};
      items.forEach((i) => { byCat[i.category] = (byCat[i.category] || 0) + i.amount; });
      res.json({
        success: true,
        data: {
          total,
          average: items.length ? total / items.length : 0,
          count: items.length,
          byCategory: Object.entries(byCat).map(([category, amount]) => ({ category, amount })),
          transactions: items,
        },
      });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  downloadExcel: async (req, res) => {
    try {
      const items = await Model.find({ userId: req.user._id }).sort({ date: -1 });
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(label);
      ws.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Description", key: "description", width: 32 },
        { header: "Category", key: "category", width: 18 },
        { header: "Amount", key: "amount", width: 14 },
      ];
      ws.getRow(1).font = { bold: true };
      items.forEach((i) => ws.addRow({ date: new Date(i.date).toISOString().slice(0, 10), description: i.description, category: i.category, amount: i.amount }));
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${label.toLowerCase()}.xlsx`);
      await wb.xlsx.write(res);
      res.end();
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
});
