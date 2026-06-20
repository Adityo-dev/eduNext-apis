import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import AuthModel from "./authModel.js";
import OtpModel from "./otpModel.js";

// JWT Secret Key ->
const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";

// Generate JWT Token Function ->
const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

const sendEmail = async (email: string, otp: string) => {
  console.log(`╔════════════════════════════════════════════╗`);
  console.log(`  📩 Sending Email to: ${email}`);
  console.log(`  🔑 Your EduNext OTP Code: ${otp}`);
  console.log(`╚════════════════════════════════════════════╝`);
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

    // Check if user already exists with the same email
    const userEmailExists = await AuthModel.findOne({ email });
    if (userEmailExists) {
      return next(createHttpError(400, "User already exists with this email"));
    }
    // Check if user already exists with the same phone number
    const userPhoneExists = await AuthModel.findOne({ phone });
    if (userPhoneExists) {
      return next(
        createHttpError(400, "User already exists with this phone number "),
      );
    }

    // Password Hashing ->
    const hashedPassword = await bcrypt.hash(password, 10);

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

    // 1. TOP Generate random numbers
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save OTP to database
    await OtpModel.create({
      email: newUser.email,
      otp: generatedOtp,
    });

    // 3. Sending OTP to user email
    await sendEmail(newUser.email, generatedOtp);

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

    // 1. If there is an old OTP, clean it from the database.
    await OtpModel.deleteMany({ email });

    // 2. Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save new OTP
    await OtpModel.create({
      email,
      otp: newOtp,
    });

    // 4. Send New OTP
    await sendEmail(email, newOtp);

    res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};
