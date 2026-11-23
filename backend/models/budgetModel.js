const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    category: { type: String, required: true, trim: true },
    limit: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);
// one monthly budget per category per user (repeats every month)
schema.index({ userId: 1, category: 1 }, { unique: true });
module.exports = mongoose.models.Budget || mongoose.model("Budget", schema);
