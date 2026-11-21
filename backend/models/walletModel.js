const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["cash", "bank", "upi", "wallet"], default: "cash" },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Wallet || mongoose.model("Wallet", schema);
