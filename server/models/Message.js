const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

MessageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
