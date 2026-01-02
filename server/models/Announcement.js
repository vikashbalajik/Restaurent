const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Announcement" },
    message: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Announcement", AnnouncementSchema);
