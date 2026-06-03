import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";

// TypeScript declaration merging to add 'user' property to Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Authentication Middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // Authorization Header or Cookie check
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  // JWT Token verify and decode
  const decoded: any = jwt.verify(token, JWT_SECRET);

  // req.user = await User.findById(decoded.id).select('-password');
  req.user = { id: decoded.id, role: decoded.role };

  next();
};

// Role Authorization Middleware (Multi-role checking)
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role (${req.user?.role}) is not allowed to access this resource`,
      );
    }
    next();
  };
};
