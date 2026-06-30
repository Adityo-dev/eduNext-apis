import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../models/reviewModel.js";

// ─── Submit Course Review (Student Only — Enrolled Course)
export const createCourseReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId, rating, comment } = req.body;
    const studentId = req.user?._id || req.user?.id;

    if (!courseId || !rating || !comment) {
      return next(
        createHttpError(400, "courseId, rating and comment are required"),
      );
    }

    // Verify Student is Enrolled
    const isEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (!isEnrolled) {
      return next(
        createHttpError(
          403,
          "You must be enrolled in this course to leave a review",
        ),
      );
    }

    // Already Reviewed check
    const alreadyReviewed = await ReviewModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyReviewed) {
      return next(
        createHttpError(400, "You have already reviewed this course"),
      );
    }

    // Create review with pending status
    const review = await ReviewModel.create({
      student: studentId,
      course: courseId,
      rating: Number(rating),
      comment,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully. It will be visible after admin approval.",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
