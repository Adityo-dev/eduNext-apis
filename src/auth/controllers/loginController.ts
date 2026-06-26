import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import AuthModel from "../models/authModel.js";

const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(
        createHttpError(400, "Please supply both email and password fields."),
      );

    const user = await AuthModel.findOne({ email }).select("+password");
    if (!user)
      return next(
        createHttpError(401, "This email is not registered with us."),
      );

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch)
      return next(createHttpError(401, "Incorrect password credentials."));

    if (!user.isEmailVerified)
      return next(
        createHttpError(
          403,
          "Email verification is pending. Please verify your OTP.",
        ),
      );

    if (user.isSuspended)
      return next(
        createHttpError(
          403,
          "Access denied. Your account is currently suspended.",
        ),
      );

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "Authentication successful. Welcome back!",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        badge: user.badge,
      },
    });
  } catch (error) {
    next(error);
  }
};
