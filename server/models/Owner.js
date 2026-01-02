const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Owner', ownerSchema);
