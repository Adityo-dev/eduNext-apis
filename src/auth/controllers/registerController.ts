import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { sendEmail } from "../../utils/sendEmail.js";
import AuthModel from "../models/authModel.js";
import OtpModel from "../models/otpModel.js";
import { sendAdminNotification } from "../../notification/services/notificationService.js";

const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";
const BCRYPT_ROUNDS = config.bcryptRounds || 10;

const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

const sendOtpEmail = async (
  email: string,
  otp: string,
  subject: string = "Verify your EduNext Account",
) => {
  const emailHtml = `
    <div style="background-color: #F9FAFB; padding: 40px 10px; font-family: sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #E5E7EB;">
        <h2 style="color: #4F46E5; text-align: center;">EduNext Platform</h2>
        <p style="font-size: 16px; color: #374151; text-align: center;">Your secure One-Time Password (OTP) is:</p>
        <div style="background-color: #F3F4F6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #6B7280; text-align: center; margin-top: 20px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    </div>
  `;
  await sendEmail({ email, subject, html: emailHtml });
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      areaOfExpertise,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return next(
        createHttpError(400, "All registration fields are required."),
      );
    }

    if (
      role === "instructor" &&
      (!areaOfExpertise ||
        !Array.isArray(areaOfExpertise) ||
        areaOfExpertise.length === 0)
    ) {
      return next(
        createHttpError(
          400,
          "Instructors must provide at least one area of expertise.",
        ),
      );
    }

    const [userEmailExists, userPhoneExists] = await Promise.all([
      AuthModel.findOne({ email }).select("_id"),
      AuthModel.findOne({ phone }).select("_id"),
    ]);

    if (userEmailExists)
      return next(
        createHttpError(
          400,
          "An account is already registered with this email address.",
        ),
      );
    if (userPhoneExists)
      return next(
        createHttpError(
          400,
          "An account is already registered with this phone number.",
        ),
      );

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await AuthModel.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: role || "student",
      areaOfExpertise: role === "instructor" ? areaOfExpertise : [],
    });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpModel.create({ email: newUser.email, otp: generatedOtp });

    sendOtpEmail(newUser.email, generatedOtp).catch((err) =>
      console.error("Background signup email failed:", err),
    );

    res.status(201).json({
      success: true,
      message:
        "Registration completed successfully. Verification OTP sent to your email.",
      user: { id: newUser._id, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return next(createHttpError(400, "Email and OTP code are required."));

    const otpRecord = await OtpModel.findOne({ email, otp });
    if (!otpRecord)
      return next(createHttpError(400, "The OTP is invalid or has expired."));

    const user = await AuthModel.findOne({ email });
    if (!user) return next(createHttpError(404, "User account not found."));

    user.isEmailVerified = true;
    await user.save();
    await OtpModel.deleteOne({ _id: otpRecord._id });

    const token = generateToken(user._id as unknown as string, user.role);

    // Notification to admin
    sendAdminNotification(
      "New User Registered",
      `A new user (${user.fullName}) just verified their account.`,
      "user_registered",
    ).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Email identity verified successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email)
      return next(createHttpError(400, "Email parameter is required."));

    const user = await AuthModel.findOne({ email });
    if (!user)
      return next(
        createHttpError(404, "No user account linked to this email address."),
      );

    await OtpModel.deleteMany({ email });
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpModel.create({ email, otp: newOtp });

    sendOtpEmail(email, newOtp).catch((err) =>
      console.error("Background resend OTP email failed:", err),
    );

    res.status(200).json({
      success: true,
      message: "A fresh verification OTP has been dispatched to your email.",
    });
  } catch (error) {
    next(error);
  }
};
