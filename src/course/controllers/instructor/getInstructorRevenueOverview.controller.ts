import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../models/courseModel.js";
import { CourseViewModel } from "../../models/courseViewModel.js";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../../../review/models/reviewModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getInstructorRevenueOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    // Get instructor's course IDs
    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id");
    const courseIds = instructorCourses.map((c) => c._id);

    // Calculate dates for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 5 months ago + current month = 6 months

    // Fetch enrollments for the last 6 months
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
      createdAt: { $gte: sixMonthsAgo },
    }).select("pricePaid createdAt");

    let totalRevenue = 0;
    let totalStudents = enrollments.length;

    // Initialize array for 6 months
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const chartDataMap = new Map<
      string,
      { month: string; revenue: number; students: number }
    >();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      chartDataMap.set(key, {
        month: monthNames[d.getMonth()] || "",
        revenue: 0,
        students: 0,
      });
    }

    enrollments.forEach((enrollment) => {
      totalRevenue += enrollment.pricePaid || 0;

      const date = new Date(enrollment.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (chartDataMap.has(key)) {
        const monthData = chartDataMap.get(key)!;
        monthData.revenue += enrollment.pricePaid || 0;
        monthData.students += 1;
      }
    });

    const chartData = Array.from(chartDataMap.values());

    sendResponse(
      res,
      200,
      true,
      "Instructor revenue overview fetched successfully",
      {
        totalRevenue,
        totalStudents,
        chartData,
      },
    );
  } catch (error) {
    next(error);
  }
};
