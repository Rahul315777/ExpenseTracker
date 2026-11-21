const Wallet = require("../models/walletModel");
const Transfer = require("../models/transferModel");
const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");

const TYPES = ["cash", "bank", "upi", "wallet"];

// balance = opening + income - expense + transfers in - transfers out
async function computeBalances(userId, wallets) {
  const sumBy = (Model, field) =>
    Model.aggregate([{ $match: { userId, [field]: { $ne: null } } }, { $group: { _id: `$${field}`, t: { $sum: "$amount" } } }]);
  const [inc, exp, tin, tout] = await Promise.all([
    sumBy(Income, "walletId"), sumBy(Expense, "walletId"), sumBy(Transfer, "toWalletId"), sumBy(Transfer, "fromWalletId"),
  ]);
  const toMap = (arr) => new Map(arr.map((x) => [String(x._id), x.t]));
  const I = toMap(inc), E = toMap(exp), TI = toMap(tin), TO = toMap(tout);
  return wallets.map((w) => {
    const id = String(w._id);
    const balance = w.openingBalance + (I.get(id) || 0) - (E.get(id) || 0) + (TI.get(id) || 0) - (TO.get(id) || 0);
    return { _id: w._id, name: w.name, type: w.type, openingBalance: w.openingBalance, balance };
  });
}

exports.getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user._id }).sort({ createdAt: 1 }).lean();
    const withBalance = await computeBalances(req.user._id, wallets);
    const transfers = await Transfer.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(20).lean();
    const nameOf = new Map(wallets.map((w) => [String(w._id), w.name]));
    res.json({
      success: true,
      data: {
        wallets: withBalance,
        totalBalance: withBalance.reduce((a, w) => a + w.balance, 0),
        transfers: transfers.map((t) => ({ ...t, fromName: nameOf.get(String(t.fromWalletId)) || "Deleted", toName: nameOf.get(String(t.toWalletId)) || "Deleted" })),
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createWallet = async (req, res) => {
  try {
    const { name, type, openingBalance } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Wallet name is required" });
    if (type && !TYPES.includes(type)) return res.status(400).json({ success: false, message: "Invalid wallet type" });
    const doc = await Wallet.create({ userId: req.user._id, name, type: type || "cash", openingBalance: Number(openingBalance) || 0 });
    res.status(201).json({ success: true, message: "Wallet created", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateWallet = async (req, res) => {
  try {
    const { name, type, openingBalance } = req.body;
    if (type && !TYPES.includes(type)) return res.status(400).json({ success: false, message: "Invalid wallet type" });
    const doc = await Wallet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, type, openingBalance: Number(openingBalance) || 0 },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Wallet not found" });
    res.json({ success: true, message: "Wallet updated", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteWallet = async (req, res) => {
  try {
    const id = req.params.id;
    const uid = req.user._id;
    const used = (await Income.exists({ userId: uid, walletId: id })) || (await Expense.exists({ userId: uid, walletId: id }))
      || (await Transfer.exists({ userId: uid, $or: [{ fromWalletId: id }, { toWalletId: id }] }));
    if (used) return res.status(400).json({ success: false, message: "This wallet has transactions or transfers, so it can't be deleted." });
    const doc = await Wallet.findOneAndDelete({ _id: id, userId: uid });
    if (!doc) return res.status(404).json({ success: false, message: "Wallet not found" });
    res.json({ success: true, message: "Wallet deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.transfer = async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, note, date } = req.body;
    const amt = Number(amount);
    if (!fromWalletId || !toWalletId || !amt || amt <= 0) return res.status(400).json({ success: false, message: "From wallet, to wallet and a positive amount are required" });
    if (String(fromWalletId) === String(toWalletId)) return res.status(400).json({ success: false, message: "Choose two different wallets" });
    const wallets = await Wallet.find({ userId: req.user._id, _id: { $in: [fromWalletId, toWalletId] } }).lean();
    if (wallets.length !== 2) return res.status(404).json({ success: false, message: "Wallet not found" });
    const [from] = await computeBalances(req.user._id, wallets.filter((w) => String(w._id) === String(fromWalletId)));
    if (from.balance < amt) return res.status(400).json({ success: false, message: `Not enough balance in ${from.name} (available ${from.balance})` });
    const doc = await Transfer.create({ userId: req.user._id, fromWalletId, toWalletId, amount: amt, note: note || "", date: date || new Date() });
    res.status(201).json({ success: true, message: "Transfer done", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteTransfer = async (req, res) => {
  try {
    const doc = await Transfer.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Transfer not found" });
    res.json({ success: true, message: "Transfer deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
