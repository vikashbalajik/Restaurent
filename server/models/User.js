const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    mobile: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    acceptedRulesAt: { type: Date, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
