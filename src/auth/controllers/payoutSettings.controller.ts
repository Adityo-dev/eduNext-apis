import type { Request, Response } from "express";
import AuthModel from "../models/authModel.js";

export const getPayoutSettings = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const instructor = await AuthModel.findById(instructorId).select(
      "payoutSettings",
    );

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

    if (!payoutSettings || !payoutSettings.method) {
      return res.status(400).json({
        success: false,
        message: "Payout method is required",
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
