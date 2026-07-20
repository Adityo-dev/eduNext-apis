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

export const getInstructorAnalyticsGrowth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const now = new Date();

    // Start of Current Month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start and End of Previous Month
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id");
    const courseIds = instructorCourses.map((c) => c._id);

    // 1. Views
    const viewsThisMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfCurrentMonth },
    });
    const viewsPreviousMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
    });

    // 2. Revenue and Students
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
      createdAt: { $gte: startOfPreviousMonth }, // Only need last 2 months
    }).select("pricePaid createdAt");

    let revenueThisMonth = 0;
    let revenuePreviousMonth = 0;
    let studentsThisMonth = 0;
    let studentsPreviousMonth = 0;

    enrollments.forEach((enrollment) => {
      if (enrollment.createdAt >= startOfCurrentMonth) {
        revenueThisMonth += enrollment.pricePaid || 0;
        studentsThisMonth += 1;
      } else if (
        enrollment.createdAt >= startOfPreviousMonth &&
        enrollment.createdAt <= endOfPreviousMonth
      ) {
        revenuePreviousMonth += enrollment.pricePaid || 0;
        studentsPreviousMonth += 1;
      }
    });

    // 3. Ratings
    const reviewsThisMonthAgg = await ReviewModel.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          createdAt: { $gte: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRatingThisMonth =
      reviewsThisMonthAgg.length > 0 ? reviewsThisMonthAgg[0].avgRating : 0;

    const reviewsPrevMonthAgg = await ReviewModel.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
        },
      },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRatingPrevMonth =
      reviewsPrevMonthAgg.length > 0 ? reviewsPrevMonthAgg[0].avgRating : 0;

    // Helpers
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    const calculateChange = (current: number, previous: number) => {
      return parseFloat((current - previous).toFixed(1));
    };

    // Calculate rating change, handle first month scenario
    let ratingChange = calculateChange(avgRatingThisMonth, avgRatingPrevMonth);
    if (
      ratingChange === 0 &&
      avgRatingThisMonth > 0 &&
      avgRatingPrevMonth === 0
    ) {
      ratingChange = avgRatingThisMonth;
    }

    sendResponse(
      res,
      200,
      true,
      "Instructor analytics growth fetched successfully",
      {
        revenueGrowth: calculateGrowth(revenueThisMonth, revenuePreviousMonth),
        studentGrowth: calculateGrowth(
          studentsThisMonth,
          studentsPreviousMonth,
        ),
        viewGrowth: calculateGrowth(viewsThisMonth, viewsPreviousMonth),
        ratingChange: ratingChange,
      },
    );
  } catch (error) {
    next(error);
  }
};
