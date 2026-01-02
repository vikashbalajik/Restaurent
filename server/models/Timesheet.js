const mongoose = require("mongoose");

const TimesheetSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: Date, required: true },
    hoursWorked: { type: Number, required: true, min: 0.5, max: 24 },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

TimesheetSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model("Timesheet", TimesheetSchema);
