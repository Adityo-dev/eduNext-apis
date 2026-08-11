import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
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

export const getInstructorOverviewStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfThisWeek = new Date();
    startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);

    // 1. Courses
    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id createdAt");

    const courseIds = instructorCourses.map((c) => c._id);
    const totalCourses = instructorCourses.length;
    let coursesThisMonth = 0;

    instructorCourses.forEach((c) => {
      if (c.createdAt && c.createdAt >= startOfThisMonth) {
        coursesThisMonth++;
      }
    });

    // 2. Students (Enrollments)
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
    }).select("createdAt");

    const totalStudents = enrollments.length;
    let studentsThisWeek = 0;

    enrollments.forEach((e) => {
      if (e.createdAt >= startOfThisWeek) {
        studentsThisWeek++;
      }
    });

    // 3. Revenue & Wallet Balance (PaymentModel)
    const payments = await PaymentModel.find({
      instructor: instructorObjectId,
      status: "paid",
    }).select("instructorEarning payoutStatus paidAt createdAt");

    let totalRevenue = 0;
    let revenueThisMonth = 0;
    let walletBalance = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    payments.forEach((p) => {
      totalRevenue += p.instructorEarning;

      if (p.createdAt >= startOfThisMonth) {
        revenueThisMonth += p.instructorEarning;
      }

      if (
        p.payoutStatus === "available" &&
        p.paidAt &&
        p.paidAt <= sevenDaysAgo
      ) {
        walletBalance += p.instructorEarning;
      }
    });

    sendResponse(
      res,
      200,
      true,
      "Instructor overview status fetched successfully",
      {
        courses: {
          total: totalCourses,
          thisMonth: coursesThisMonth,
        },
        students: {
          total: totalStudents,
          thisWeek: studentsThisWeek,
        },
        revenue: {
          total: totalRevenue,
          thisMonth: revenueThisMonth,
        },
        walletBalance,
      },
    );
  } catch (error) {
    next(error);
  }
};
