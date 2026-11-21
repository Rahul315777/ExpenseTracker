const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    kind: { type: String, enum: ["income", "expense"], required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", default: null },
    frequency: { type: String, enum: ["weekly", "monthly", "yearly"], default: "monthly" },
    startDate: { type: Date, required: true },
    nextDue: { type: Date, required: true },
    anchorDay: { type: Number, required: true }, // day of month to keep (clamped for short months)
    active: { type: Boolean, default: true },
    isSubscription: { type: Boolean, default: false },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Recurring || mongoose.model("Recurring", schema);
