import type { Request, Response } from "express";
import AuthModel from "../models/authModel.js";

export const getPayoutSettings = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const instructor =
      await AuthModel.findById(instructorId).select("payoutSettings");

    if (!instructor) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Payout settings fetched successfully",
      data: instructor.payoutSettings || null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePayoutSettings = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const payoutSettings = req.body;

    if (!payoutSettings || Object.keys(payoutSettings).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Payout settings data is required",
      });
    }

    const bdMobileRegex = /^01[3-9]\d{8}$/;

    if (
      payoutSettings.bkash?.mobileNumber &&
      !bdMobileRegex.test(payoutSettings.bkash.mobileNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid bKash mobile number. Must be a valid 11-digit Bangladeshi number (e.g., 01712345678).",
      });
    }

    if (
      payoutSettings.nagad?.mobileNumber &&
      !bdMobileRegex.test(payoutSettings.nagad.mobileNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Nagad mobile number. Must be a valid 11-digit Bangladeshi number (e.g., 01712345678).",
      });
    }

    const instructor = await AuthModel.findByIdAndUpdate(
      instructorId,
      { payoutSettings },
      { new: true, runValidators: true },
    ).select("payoutSettings");

    if (!instructor) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Payout settings updated successfully",
      data: instructor.payoutSettings,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
