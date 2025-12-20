import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../users';

interface DecodedToken {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: UserRole;
}

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return secret;
};

export const authMiddleware: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = header.substring('Bearer '.length);

  try {
    const decoded = jwt.verify(token, getAccessSecret()) as DecodedToken;
    (req as AuthenticatedRequest).userId = decoded.sub;
    (req as AuthenticatedRequest).role = decoded.role;
    return next();
  } catch (error) {
    console.error('AuthMiddlewareError', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const roleMiddleware = (allowedRoles: UserRole[]): RequestHandler => {
  return (req, res, next) => {
    const role = (req as AuthenticatedRequest).role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return next();
  };
};
