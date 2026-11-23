const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    person: { type: String, required: true, trim: true },
    // "lent": you gave money, they owe you. "borrowed": you took money, you owe them.
    direction: { type: String, enum: ["lent", "borrowed"], required: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
    dueDate: { type: Date, default: null },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Debt || mongoose.model("Debt", schema);
