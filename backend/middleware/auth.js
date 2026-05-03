import jwt from 'jsonwebtoken'

const authMiddleware = (req, res, next) => {
  // Priority 1: HttpOnly cookie (preferred — XSS-safe)
  // Priority 2: Authorization header (fallback for tools/testing)
  let token = req.cookies?.token

  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export default authMiddleware