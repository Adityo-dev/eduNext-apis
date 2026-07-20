import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { CourseViewModel } from "../../../course/models/courseViewModel.js";
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

export const getInstructorAnalyticsStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id totalViews");
    const courseIds = instructorCourses.map((c) => c._id);

    // 1. Views
    const totalViews = instructorCourses.reduce(
      (acc, c) => acc + (c.totalViews || 0),
      0,
    );
    const viewsThisMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfCurrentMonth },
    });

    // 2. Revenue and Students
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
    }).select("pricePaid createdAt");

    let totalRevenue = 0;
    let revenueThisMonth = 0;
    let totalStudents = enrollments.length;
    let studentsThisMonth = 0;

    enrollments.forEach((enrollment) => {
      totalRevenue += enrollment.pricePaid || 0;
      if (enrollment.createdAt >= startOfCurrentMonth) {
        revenueThisMonth += enrollment.pricePaid || 0;
        studentsThisMonth += 1;
      }
    });

    // 3. Ratings
    const reviewsAgg = await ReviewModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const avgRating =
      reviewsAgg.length > 0
        ? parseFloat(reviewsAgg[0].avgRating.toFixed(1))
        : 0;
    const totalReviews = reviewsAgg.length > 0 ? reviewsAgg[0].totalReviews : 0;

    sendResponse(
      res,
      200,
      true,
      "Instructor analytics stats fetched successfully",
      {
        revenue: {
          total: totalRevenue,
          thisMonth: revenueThisMonth,
        },
        students: {
          total: totalStudents,
          thisMonth: studentsThisMonth,
        },
        views: {
          total: totalViews,
          thisMonth: viewsThisMonth,
        },
        rating: {
          average: avgRating,
          totalReviews: totalReviews,
        },
      },
    );
  } catch (error) {
    next(error);
  }
};
