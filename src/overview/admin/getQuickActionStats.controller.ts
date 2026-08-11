import type { NextFunction, Request, Response } from "express";
import AuthModel from "../../auth/models/authModel.js";
import CourseModel from "../../course/models/courseModel.js";
import { ReviewModel } from "../../review/models/reviewModel.js";
import { WithdrawalModel } from "../../payment/models/withdrawal.model.js";

// 11. Get Admin Quick Action Stats
export const getQuickActionStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      pendingBadgeRequests,
      pendingWithdrawals,
      pendingReviews,
      pendingCourses,
    ] = await Promise.all([
      AuthModel.countDocuments({
        role: "instructor",
        "badgeRequest.status": "pending",
      }),
      WithdrawalModel.countDocuments({ status: "pending" }),
      ReviewModel.countDocuments({ status: "pending" }),
      CourseModel.countDocuments({ status: "pending" }),
    ]);

    res.status(200).json({
      success: true,
      message: "Quick action stats fetched successfully",
      data: {
        pendingBadgeRequests,
        pendingWithdrawals,
        pendingReviews,
        pendingCourses,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
