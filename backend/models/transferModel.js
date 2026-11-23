const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    fromWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    toWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Transfer || mongoose.model("Transfer", schema);
