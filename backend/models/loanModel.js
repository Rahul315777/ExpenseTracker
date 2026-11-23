const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    name: { type: String, required: true, trim: true },
    lender: { type: String, trim: true, default: "" },
    principal: { type: Number, required: true, min: 1 },
    annualRate: { type: Number, required: true, min: 0, max: 100 },
    tenureMonths: { type: Number, required: true, min: 1, max: 480 },
    firstEmiDate: { type: Date, required: true },
    paid: { type: [{ installment: Number, paidOn: { type: Date, default: Date.now }, _id: false }], default: [] },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Loan || mongoose.model("Loan", schema);
