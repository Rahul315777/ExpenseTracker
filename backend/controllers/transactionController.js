const ExcelJS = require("exceljs");
const { getRange } = require("../utils");

// Factory: builds CRUD + overview + excel handlers for a model (Income or Expense)
module.exports = (Model, label) => ({
  add: async (req, res) => {
    try {
      const { description, amount, category, date } = req.body;
      if (!description || amount === undefined || amount === "" || !category || !date)
        return res.status(400).json({ success: false, message: "description, amount, category and date are required" });
      if (Number.isNaN(Number(amount)) || Number(amount) < 0) return res.status(400).json({ success: false, message: "Amount must be a positive number" });
      const doc = await Model.create({ userId: req.user._id, description, amount: Number(amount), category, date });
      res.status(201).json({ success: true, message: `${label} added`, data: doc });
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
      const { description, amount, category, date } = req.body;
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { description, amount: Number(amount), category, date },
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
