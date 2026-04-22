const mongoose = require("mongoose");

// ── Fee Structure ─────────────────────────────────────────────────────────────
// Principal sets ONE annual amount per class.
// When a new academic year starts, principal sets this once for each class.
// All students in that class inherit this amount when their StudentFee is created.
const FeeStructureSchema = new mongoose.Schema(
  {
    classNo: { type: Number, required: true },
    annualAmount: { type: Number, required: true, min: 0 },
    academicYear: { type: String, required: true, default: "2025-2026" },
  },
  { timestamps: true }
);

// ── Student Fee ───────────────────────────────────────────────────────────────
// ONE record per student per academic year.
// annualAmount starts from FeeStructure but can be overridden by principal
// (e.g. for poor families). Every payment reduces the balance.
// payments[] is the full ledger — date, amount, note, who recorded it.
const PaymentEntrySchema = new mongoose.Schema(
  {
    amount:     { type: Number, required: true, min: 1 },
    date:       { type: Date, default: Date.now },
    note:       { type: String, default: "" },        // e.g. "April instalment", "Cash"
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const StudentFeeSchema = new mongoose.Schema(
  {
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    academicYear: { type: String, required: true, default: "2025-2026" },
    annualAmount: { type: Number, required: true, min: 0 },  // editable per student
    amountPaid:   { type: Number, default: 0 },              // sum of all payments
    balance:      { type: Number, default: 0 },              // annualAmount - amountPaid
    status:       { type: String, enum: ["unpaid", "partial", "paid", "waived"], default: "unpaid" },
    waived:       { type: Boolean, default: false },
    waiverNote:   { type: String, default: "" },
    payments:     [PaymentEntrySchema],                      // full ledger
  },
  { timestamps: true }
);

// One fee record per student per academic year
StudentFeeSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });
StudentFeeSchema.index({ status: 1 });

// Auto-compute balance and status before every save
StudentFeeSchema.pre("save", function (next) {
  this.amountPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  this.balance    = Math.max(0, this.annualAmount - this.amountPaid);
  if (this.waived) {
    this.status = "waived";
  } else if (this.amountPaid === 0) {
    this.status = "unpaid";
  } else if (this.balance === 0) {
    this.status = "paid";
  } else {
    this.status = "partial";
  }
  next();
});

const FeeStructure = mongoose.model("FeeStructure", FeeStructureSchema);
const StudentFee   = mongoose.model("StudentFee",   StudentFeeSchema);

module.exports = { FeeStructure, StudentFee };