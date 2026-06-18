import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "../enrollment/enrollmentModel.js";
import { ReviewModel } from "./reviewModel.js";

// ─── 1. Create Course Review (Only Student)
export const createCourseReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId, rating, comment } = req.body;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!rating || !comment) {
      return next(createHttpError(400, "Rating and comment are required"));
    }

    // Verify Student is Enrolled Or not
    const isEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (!isEnrolled) {
      return next(
        createHttpError(
          403,
          "You must purchase the course before leaving a review",
        ),
      );
    }

    // Already Reviewed Check
    const alreadyReviewed = await ReviewModel.findOne({
      student: studentId,
      course: courseId,
    });

    if (alreadyReviewed) {
      return next(
        createHttpError(400, "You have already reviewed this course"),
      );
    }

    // Create Review
    const review = await ReviewModel.create({
      student: studentId,
      course: courseId,
      rating: Number(rating),
      comment,
    });

    //  Dynamic Course Average Rating Calculate
    const stats = await ReviewModel.aggregate([
      { $match: { course: courseId } },
      { $group: { _id: "$course", avgRating: { $avg: "$rating" } } },
    ]);

    const newAverageRating =
      stats.length > 0
        ? Math.round(stats[0].avgRating * 10) / 10
        : Number(rating);

    // save New rating
    await CourseModel.findByIdAndUpdate(courseId, { rating: newAverageRating });

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Get Single Course All Review
export const getCourseReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    // if (!courseId || Array.isArray(courseId)) {
    //   return next(createHttpError(400, "Invalid course id"));
    // }

    const reviews = await ReviewModel.find({ course: courseId })
      .populate("student", "firstName lastName avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
