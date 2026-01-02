const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const owner = await Owner.findOne({ email: (email || '').toLowerCase() });
    if (!owner) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, owner.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: owner._id, role: 'owner', email: owner.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      owner: { id: owner._id, email: owner.email, name: owner.name }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
