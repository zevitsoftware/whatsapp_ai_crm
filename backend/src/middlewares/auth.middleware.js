const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AuthMiddleware] No token provided in header');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id, email, role, iat, exp }
      next();
    } catch (err) {
      console.error('[AuthMiddleware] JWT Verification Failed:', err.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  } catch (error) {
    console.error('[AuthMiddleware] unexpected error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Auth processing error' });
  }
};
