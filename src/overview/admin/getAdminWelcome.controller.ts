import type { NextFunction, Request, Response } from "express";
import AuthModel from "../../auth/models/authModel.js";
import CourseModel from "../../course/models/courseModel.js";
import { ReviewModel } from "../../review/models/reviewModel.js";
import { WithdrawalModel } from "../../payment/models/withdrawal.model.js";
import { PaymentModel } from "../../payment/models/payment.model.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getAdminWelcome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as any).user;
    const name = user?.name || "Admin";

    const [
      totalUsers,
      revenueStats,
      pendingBadgeRequests,
      pendingWithdrawals,
      pendingReviews,
      pendingCourses,
    ] = await Promise.all([
      AuthModel.countDocuments(),
      PaymentModel.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: "$commissionAmount" },
          },
        },
      ]),
      AuthModel.countDocuments({
        role: "instructor",
        "badgeRequest.status": "pending",
      }),
      WithdrawalModel.countDocuments({ status: "pending" }),
      ReviewModel.countDocuments({ status: "pending" }),
      CourseModel.countDocuments({ status: "pending" }),
    ]);

    const totalCommission = revenueStats[0]?.totalCommission || 0;
    const totalActions =
      pendingBadgeRequests +
      pendingWithdrawals +
      pendingReviews +
      pendingCourses;

    sendResponse(res, 200, true, "Admin welcome data fetched successfully", {
      name,
      totalUsers,
      totalCommission,
      totalActions,
    });
  } catch (error) {
    next(error);
  }
};
