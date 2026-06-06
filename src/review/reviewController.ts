import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "../enrollment/enrollmentModel.js";
import { ReviewModel } from "./reviewModel.js";

// ─── ১. কোর্সে রিভিউ এবং রেটিং দেওয়া
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

    // ১. স্টুডেন্ট আসলেই এই কোর্সটি কিনেছে কিনা তা ভেরিফাই করা (পাওয়ারফুল সিকিউরিটি)
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

    // ২. অলরেডি রিভিউ দিয়ে ফেলেছে কিনা চেক
    const alreadyReviewed = await ReviewModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyReviewed) {
      return next(
        createHttpError(400, "You have already reviewed this course"),
      );
    }

    // ৩. রিভিউ তৈরি করা
    const review = await ReviewModel.create({
      student: studentId,
      course: courseId,
      rating: Number(rating),
      comment,
    });

    // ৪. ডাইনামিকলি কোর্সের এভারেজ রেটিং (Average Rating) ক্যালকুলেট করা (Mongoose Aggregation)
    const stats = await ReviewModel.aggregate([
      { $match: { course: course.courseId } },
      { $group: { _id: "$course", avgRating: { $avg: "$rating" } } },
    ]);

    const newAverageRating =
      stats.length > 0
        ? Math.round(stats[0].avgRating * 10) / 10
        : Number(rating);

    // ৫. কোর্স মডেলে নতুন রেটিং সেভ করা
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

// ─── ২. একটি নির্দিষ্ট কোর্সের সব রিভিউ দেখা (Public)
export const getCourseReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.params;

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
