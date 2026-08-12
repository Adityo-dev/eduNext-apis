import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../../review/models/reviewModel.js";
import AuthModel from "../../auth/models/authModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getInstructorWelcome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as any).user;
    const instructorId = user?._id || user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const instructorDoc = await AuthModel.findById(instructorId).select("fullName firstName");
    const name = instructorDoc?.fullName || instructorDoc?.firstName || "Instructor";

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id status");

    const courseIds = instructorCourses.map((c) => c._id);
    const totalCourses = instructorCourses.length;
    let activeCourses = 0;
    let pendingCourses = 0;

    instructorCourses.forEach((c) => {
      if (c.status === "published") {
        activeCourses++;
      } else if (c.status === "pending") {
        pendingCourses++;
      }
    });

    const newEnrollmentsToday = await EnrollmentModel.countDocuments({
      course: { $in: courseIds },
      paymentStatus: "completed",
      createdAt: { $gte: startOfToday },
    });

    const reviewsAgg = await ReviewModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
        },
      },
    ]);
    const avgRating =
      reviewsAgg.length > 0
        ? parseFloat(reviewsAgg[0].avgRating.toFixed(1))
        : 0;

    sendResponse(
      res,
      200,
      true,
      "Instructor welcome data fetched successfully",
      {
        instructorName: name,
        activeCourses,
        pendingCourses,
        newEnrollmentsToday,
        avgRating,
        totalCourses,
      },
    );
  } catch (error) {
    next(error);
  }
};
