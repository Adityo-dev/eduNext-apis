import type { NextFunction, Request, Response } from "express";
import AuthModel from "../../auth/models/authModel.js";
import CourseModel from "../../course/models/courseModel.js";
import { PaymentModel } from "../../payment/models/payment.model.js";

// 10. Get Admin Dashboard Overview Stats
export const getAdminOverviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalCourses,
      newCoursesThisMonth,
      revenueStats,
      currentMonthRevenueStats,
    ] = await Promise.all([
      AuthModel.countDocuments(),
      AuthModel.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
      CourseModel.countDocuments(),
      CourseModel.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
      PaymentModel.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalCommission: { $sum: "$commissionAmount" },
          },
        },
      ]),
      PaymentModel.aggregate([
        { $match: { status: "paid", paidAt: { $gte: startOfCurrentMonth } } },
        {
          $group: {
            _id: null,
            newRevenueThisMonth: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const totalCommission = revenueStats[0]?.totalCommission || 0;
    const newRevenueThisMonth =
      currentMonthRevenueStats[0]?.newRevenueThisMonth || 0;

    res.status(200).json({
      success: true,
      message: "Overview stats fetched successfully",
      data: {
        totalUsers,
        newUsersThisMonth,
        totalCourses,
        newCoursesThisMonth,
        totalRevenue,
        newRevenueThisMonth,
        totalCommission,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
