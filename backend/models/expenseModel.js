const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", default: null },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "Recurring", default: null },
    type: { type: String, default: "expense" },
  },
  { timestamps: true }
);
module.exports = mongoose.models.expense || mongoose.model("expense", schema);
