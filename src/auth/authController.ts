import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import { sendEmail } from "../utils/sendEmail.js";
import AuthModel from "./authModel.js";
import OtpModel from "./otpModel.js";

// JWT Secret Key ->
const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";
// BCRYPT rounds
const BCRYPT_ROUNDS = config.bcryptRounds;

// Generate JWT Token Function ->
const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

// send OTP Email Template
const sendOtpEmail = async (email: string, otp: string) => {
  const emailHtml = `
  <div style="background-color: #F9FAFB; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #E5E7EB;">
      
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); height: 8px;"></div>
      
      <div style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #4F46E5; letter-spacing: -0.5px;">EduNext</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B7280; text-spacing: 1px; text-transform: uppercase; font-weight: 600;">Empowering Next-Gen Learning</p>
        </div>

        <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827; text-align: center;">Verify Your Email Address</h2>
        <p style="margin: 0 0 32px 0; font-size: 15px; color: #4B5563; line-height: 1.6; text-align: center;">
          Thank you for joining EduNext! To complete your registration, please use the secure One-Time Password (OTP) below.
        </p>

        <div style="background-color: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; border: 1px solid #E5E7EB;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B7280; font-weight: 700; margin-bottom: 10px;">Verification Code</div>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 6px; color: #4F46E5; font-family: 'Courier New', Courier, monospace; display: inline-block;">
            ${otp}
          </div>
        </div>

        <div style="display: flex; background-color: #EEF2F6; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5; text-align: center; width: 100%;">
            ⏱️ This code is valid for <strong>10 minutes</strong>. For your security, do not share this code with anyone.
          </p>
        </div>

        <p style="margin: 0; font-size: 14px; color: #9CA3AF; text-align: center; line-height: 1.5;">
          If you did not request this verification, you can safely ignore this email.
        </p>
      </div>

      <div style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;">&copy; 2026 EduNext Platform. All rights reserved.</p>
        <div style="font-size: 11px; color: #9CA3AF;">
          Dhaka, Bangladesh
        </div>
      </div>

    </div>
  </div>
`;

  try {
    await sendEmail({
      email,
      subject: "Verify your EduNext Account",
      html: emailHtml,
    });
  } catch (error) {
    console.error(
      "Notification: Email sending failed but process continuing.",
      error,
    );
  }
};

// Signup ->
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

    // Validation ->
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return next(createHttpError(400, "All fields are required"));
    }

    // instructor must provide area of expertise
    if (role === "instructor") {
      if (
        !areaOfExpertise ||
        !Array.isArray(areaOfExpertise) ||
        areaOfExpertise.length === 0
      ) {
        return next(
          createHttpError(
            400,
            "Instructors must provide at least one area of expertise",
          ),
        );
      }
    }

    //  User Email And Phone Number Is Exists or not
    const [userEmailExists, userPhoneExists] = await Promise.all([
      AuthModel.findOne({ email }).select("_id"),
      AuthModel.findOne({ phone }).select("_id"),
    ]);

    if (userEmailExists) {
      return next(createHttpError(400, "User already exists with this email"));
    }
    if (userPhoneExists) {
      return next(
        createHttpError(400, "User already exists with this phone number"),
      );
    }

    // password hashed
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create New User ->
    const newUser = await AuthModel.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: role || "student",
      areaOfExpertise,
    });

    // 1. Generate random OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save OTP to database
    await OtpModel.create({
      email: newUser.email,
      otp: generatedOtp,
    });

    // 3. sent OTP
    sendOtpEmail(newUser.email, generatedOtp).catch((err) =>
      console.error("Background email send failed (signup):", err),
    );

    // Send Signup Success Response ->
    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      user: {
        id: newUser?._id,
        firstName: newUser?.firstName,
        lastName: newUser?.lastName,
        fullName: `${newUser?.firstName} ${newUser?.lastName}`,
        email: newUser?.email,
        phone: newUser?.phone,
        role: newUser?.role,
        areaOfExpertise: newUser?.areaOfExpertise,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login ->
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation ->
    if (!email || !password) {
      return next(createHttpError(400, "Please provide email and password"));
    }

    // Check if user exists
    const user = await AuthModel.findOne({ email }).select("+password");
    if (!user) {
      return next(
        createHttpError(
          401,
          "This email is not registered. Please sign up first",
        ),
      );
    }

    // Check if user password and email match
    const isPasswordMatch = await bcrypt.compare(password, user?.password);
    if (!isPasswordMatch) {
      return next(createHttpError(401, "Invalid email or password"));
    }

    // check if user email is verified
    if (!user?.isEmailVerified) {
      return next(
        createHttpError(
          403,
          "Your email is not verified. Please verify your OTP first",
        ),
      );
    }

    // check if instructor is admin approval
    if (user.role === "instructor" && !user.isVerified) {
      return next(
        createHttpError(
          403,
          "Your instructor account is pending admin approval",
        ),
      );
    }

    // check if user is suspended
    if (user?.isSuspended) {
      return next(createHttpError(403, "Your account has been suspended"));
    }

    // Generate JWT Token ->
    const token = generateToken(user?._id as unknown as string, user?.role);

    // Send Login Success Response ->
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        id: user?._id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        fullName: `${user?.firstName} ${user?.lastName}`,
        email: user?.email,
        phone: user?.phone,
        role: user?.role,
        areaOfExpertise: user?.areaOfExpertise,
      },
    });
  } catch (error) {
    next(error);
  }
};

// VERIFY OTP ->
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(createHttpError(400, "Email and OTP are required"));
    }

    // 1. Find the latest OTP for this email from the dataBase
    const otpRecord = await OtpModel.findOne({ email, otp });
    if (!otpRecord) {
      return next(createHttpError(400, "Invalid or expired OTP"));
    }

    // 2. Finding user accounts
    const user = await AuthModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // 3. Ste email verification stats True
    user.isEmailVerified = true;
    await user.save();

    // 4 If verification is successful, the OTP record is deleted from the database.
    await OtpModel.deleteOne({ _id: otpRecord._id });

    // 5. If OTP is successful, token will be generated here
    const token = generateToken(user._id as unknown as string, user.role);

    res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.role,
        areaOfExpertise: user.areaOfExpertise,
      },
    });
  } catch (error) {
    next(error);
  }
};

// RESEND OTP ->
export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(createHttpError(400, "Email is required"));
    }

    const user = await AuthModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // 1. Delete old OTPs and generate a new one
    await OtpModel.deleteMany({ email });

    // 2. Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save new OTP to database
    await OtpModel.create({
      email,
      otp: newOtp,
    });

    // 4. PERFORMANCE FIX: Fire-and-forget email — don't block the response
    sendOtpEmail(email, newOtp).catch((err) =>
      console.error("Background email send failed (resend-otp):", err),
    );

    res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};
