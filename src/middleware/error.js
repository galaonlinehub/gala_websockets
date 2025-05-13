import { logger } from "../utils/logger.js";

export function errorMiddleware(err, req, res, next) {
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    method: req.method, 
    url: req.url, 
    ip: req.ip, 
    user: req.user ? req.user.id : 'unauthenticated', 
    timestamp: new Date().toISOString(),
  };
  logger.error('Error occurred:', JSON.stringify(errorDetails, null, 2));

  const isProduction = process.env.NODE_ENV === 'production';
  const response = {
    message: isProduction ? 'Something went wrong.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }), 
  };

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({ message: 'Resource not found' });
  } else {
    res.status(err.statusCode || 500).json(response);
    next(err); 
  }
}