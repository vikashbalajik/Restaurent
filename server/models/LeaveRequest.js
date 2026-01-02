const mongoose = require("mongoose");

const LeaveRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model("LeaveRequest", LeaveRequestSchema);
