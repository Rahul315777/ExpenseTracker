const mongoose = require("mongoose");
const contributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true }, // positive = added, negative = withdrawn
    note: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 1 },
    targetDate: { type: Date, default: null },
    contributions: { type: [contributionSchema], default: [] },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Goal || mongoose.model("Goal", schema);
