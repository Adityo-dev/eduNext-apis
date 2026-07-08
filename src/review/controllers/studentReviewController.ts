import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
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
    const rawStudentId = req.user?._id || req.user?.id;

    if (!courseId || !rating || !comment) {
      return next(
        createHttpError(400, "courseId, rating and comment are required"),
      );
    }

    if (!Types.ObjectId.isValid(rawStudentId)) {
      return next(createHttpError(401, "Invalid or missing student identity"));
    }

    const studentId = new Types.ObjectId(rawStudentId);

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
      message:
        "Review submitted successfully. It will be visible after admin approval.",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Student Review Stats
export const getStudentReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = req.user?._id || req.user?.id;

    const stats = await ReviewModel.aggregate([
      { $match: { student: new Types.ObjectId(studentId as string) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
        },
      },
    ]);

    const data =
      stats.length > 0 ? stats[0] : { total: 0, published: 0, pending: 0 };
    delete data._id;

    res.status(200).json({
      success: true,
      message: "Student review stats fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Student Submitted Reviews
export const getStudentSubmittedReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = new Types.ObjectId(req.user?._id || req.user?.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ student: studentId })
        .populate({
          path: "course",
          select: "title thumbnail instructor",
          populate: { path: "instructor", select: "firstName lastName" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments({ student: studentId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Submitted reviews fetched successfully",
      data: reviews,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Student Unreviewed Courses
export const getStudentUnreviewedCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = new Types.ObjectId(req.user?._id || req.user?.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    // Get all courses the student has reviewed
    const reviewedCourses = await ReviewModel.find({
      student: studentId,
    }).distinct("course");

    // Find enrollments where the course is not in the reviewedCourses list
    const [enrollments, total] = await Promise.all([
      EnrollmentModel.find({
        student: studentId,
        course: { $nin: reviewedCourses },
      })
        .populate({
          path: "course",
          select: "title thumbnail instructor",
          populate: { path: "instructor", select: "firstName lastName" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EnrollmentModel.countDocuments({
        student: studentId,
        course: { $nin: reviewedCourses },
      }),
    ]);

    // Extract course data from enrollments
    const courses = enrollments.map((e) => e.course);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Unreviewed courses fetched successfully",
      data: courses,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Course Review (Student Only)
export const updateCourseReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId as string;
    const { rating, comment } = req.body;
    const rawStudentId = req.user?._id || req.user?.id;

    if (!Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, "Invalid reviewId"));
    }

    if (!Types.ObjectId.isValid(rawStudentId)) {
      return next(createHttpError(401, "Invalid or missing student identity"));
    }

    const studentId = new Types.ObjectId(rawStudentId);

    const review = await ReviewModel.findOne({
      _id: reviewId,
      student: studentId,
    });
    if (!review) {
      return next(
        createHttpError(404, "Review not found or you are not authorized"),
      );
    }

    if (rating) review.rating = Number(rating);
    if (comment) review.comment = comment;

    review.status = "pending";

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully. It is now pending approval.",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
