const mongoose = require("mongoose");

const ShiftSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "17:00"
    role: { type: String, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ShiftSchema.index({ date: 1, assignedTo: 1 });

module.exports = mongoose.model("Shift", ShiftSchema);
