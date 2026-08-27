const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.cookies && req.cookies.admin_token);

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { signToken, requireAdmin, JWT_SECRET };
