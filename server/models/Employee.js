const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:{ type: String, required: true },
    mobile:     { type: String, required: true },
    address:    { type: String, required: true },
    date:       { type: Date,   required: true }, // date of joining
    aadharNo:   { type: String, required: true, unique: true },
    section:    { type: String, enum: ['Front of House', 'Back of House'], required: true },
    role:       { type: String, required: true },
    duties:     { type: String, default: '' },
    status:     { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', EmployeeSchema);
