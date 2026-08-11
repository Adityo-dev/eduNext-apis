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
    <div style="background-color: #F0F4F8; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 42px;">🔐</span>
        </div>

        <h2 style="color: #1E40AF; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
          Verify Your Identity
        </h2>

        <p style="text-align: center; color: #64748B; font-size: 14px; margin: 0 0 28px 0;">
          Use the code below to verify your EduNext account
        </p>

        <div style="background: linear-gradient(135deg, #EEF2FF, #E0E7FF); padding: 20px; text-align: center; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1E40AF; border-radius: 12px; border: 2px dashed #818CF8;">
          ${otp}
        </div>

        <p style="font-size: 13px; color: #94A3B8; text-align: center; margin-top: 24px; line-height: 1.5;">
          ⏱️ This code expires in <strong>10 minutes</strong>.<br/>
          If you didn't request this, you can safely ignore this email.
        </p>

        <div style="border-top: 1px solid #E2E8F0; margin-top: 28px; padding-top: 16px; text-align: center;">
          <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
            © ${new Date().getFullYear()} EduNext · Secure Verification System
          </p>
        </div>
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
