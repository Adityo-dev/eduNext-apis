import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { sendEmail } from "../../utils/sendEmail.js";
import AuthModel from "../models/authModel.js";
import OtpModel from "../models/otpModel.js";

const BCRYPT_ROUNDS = config.bcryptRounds || 10;

// 1. Forget Password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) return next(createHttpError(400, "Account email is required."));

    const user = await AuthModel.findOne({ email });
    if (!user)
      return next(
        createHttpError(404, "No account associated with this email address."),
      );

    await OtpModel.deleteMany({ email });
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpModel.create({ email, otp: resetOtp });

    const htmlContent = `
    <div style="background-color: #FFF7ED; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #FED7AA; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 42px;">🔑</span>
        </div>

        <h2 style="color: #C2410C; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
          Password Recovery
        </h2>

        <p style="text-align: center; color: #64748B; font-size: 14px; margin: 0 0 28px 0;">
          Use the code below to reset your EduNext password
        </p>

        <div style="background: linear-gradient(135deg, #FFF7ED, #FFEDD5); padding: 20px; text-align: center; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #C2410C; border-radius: 12px; border: 2px dashed #FB923C;">
          ${resetOtp}
        </div>

        <p style="font-size: 13px; color: #94A3B8; text-align: center; margin-top: 24px; line-height: 1.5;">
          ⏱️ This code expires in <strong>10 minutes</strong>.<br/>
          If you didn't request a password reset, please ignore this email.
        </p>

        <div style="border-top: 1px solid #FED7AA; margin-top: 28px; padding-top: 16px; text-align: center;">
          <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
            © ${new Date().getFullYear()} EduNext · Account Security
          </p>
        </div>
      </div>
    </div>
    `;
    sendEmail({
      email,
      subject: "🔑 Password Reset Recovery Code — EduNext",
      html: htmlContent,
    }).catch((err) => console.error("Reset email trigger failure:", err));

    res.status(200).json({
      success: true,
      message: "A password recovery code has been routed to your email.",
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify Reset OTP
export const verifyResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return next(createHttpError(400, "Email and OTP are required."));

    const otpRecord = await OtpModel.findOne({ email, otp });
    if (!otpRecord)
      return next(
        createHttpError(400, "The recovery OTP code is wrong or expired."),
      );

    // Generate a temporary reset token valid for 15 minutes
    const resetToken = jwt.sign({ email }, config.jwtSecret as string, {
      expiresIn: "15m",
    });

    // Delete the OTP as it has been verified
    await OtpModel.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Reset Password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return next(
        createHttpError(
          400,
          "Reset token and new secure password are required.",
        ),
      );
    if (newPassword.length < 6)
      return next(
        createHttpError(
          400,
          "New password must contain at least 6 characters.",
        ),
      );

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, config.jwtSecret as string);
    } catch (err) {
      return next(
        createHttpError(
          401,
          "Invalid or expired reset token. Please request a new OTP.",
        ),
      );
    }

    const email = decoded.email;
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await AuthModel.findOneAndUpdate({ email }, { password: hashedPassword });

    res.status(200).json({
      success: true,
      message:
        "Your account password has been reset successfully. Proceed to login.",
    });
  } catch (error) {
    next(error);
  }
};

// 3 . Change Password - Authenticated User
export const changePassword = async (
  req: any,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!oldPassword || !newPassword)
      return next(
        createHttpError(400, "Current password and new password are required."),
      );

    if (newPassword.length < 6)
      return next(
        createHttpError(
          400,
          "New password must be at least 6 characters long.",
        ),
      );

    const user = await AuthModel.findById(userId).select("+password");
    if (!user) return next(createHttpError(404, "User session not found."));

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch)
      return next(
        createHttpError(401, "Your current password statement is incorrect."),
      );

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Security password updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};
