const jwt = require('jsonwebtoken');

function requireAuth(requiredRole = null) {
  return (req, res, next) => {
    try {
      const h = req.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Missing token' });

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { requireAuth };
