const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validators/authSchemas');

const router = express.Router();

// e.g. SS-3F7K8PQA  (8-char core; server still guarantees uniqueness)
const makeUserId = () => `SS-${nanoid(8).toUpperCase()}`;

// -------- REGISTER -----------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const { firstName, lastName, email, mobile, password } = parsed;

    // Generate server-side userId if not provided
    let userId = parsed.userId || makeUserId();
    for (let i = 0; i < 3; i++) {
      const exists = await User.exists({ userId });
      if (!exists) break;
      userId = makeUserId();
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ✨ Normalize mobile to digits only so login by phone is reliable
    const cleanMobile = mobile ? mobile.replace(/\D/g, '') : undefined;

    const user = await User.create({
      userId,
      firstName,
      lastName,
      email: email || undefined,
      mobile: cleanMobile || undefined, // <-- applied change
      passwordHash,
      acceptedRulesAt: new Date()
    });

    res.status(201).json({
      message: 'Registered',
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate field', fields: err.keyValue });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------- LOGIN --------------------------------------------------------------
// Accepts: userId OR email OR mobile (digits) + password
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const id = identifier.trim();
    const byUserId = id.toUpperCase();
    const byEmail = id.toLowerCase();
    const byMobile = id.replace(/\D/g, '');

    const user = await User.findOne({
      $or: [{ userId: byUserId }, { email: byEmail }, { mobile: byMobile }]
    });

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    // TODO: issue JWT if you want sessions; for now return basic profile
    res.json({
      message: 'Logged in',
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
