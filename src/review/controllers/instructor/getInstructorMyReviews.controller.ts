import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const getInstructorMyReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = new Types.ObjectId(req.user?._id || req.user?.id);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    // Filters
    const courseId = req.query.courseId as string | undefined;
    const search = req.query.search as string | undefined;
    const rating = req.query.rating as string | undefined;

    // Build course query for this instructor
    const instructorCourseQuery: any = { instructor: instructorId };
    if (courseId) {
      instructorCourseQuery._id = courseId;
    }
    if (search && search.trim()) {
      instructorCourseQuery.title = { $regex: search.trim(), $options: "i" };
    }

    const instructorCourses = await CourseModel.find(
      instructorCourseQuery,
    ).select("_id title");
    const courseIds = instructorCourses.map((c) => c._id);

    if (courseIds.length === 0) {
      res.status(200).json({
        success: true,
        message: "No courses found for this instructor",
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
      return;
    }

    // Build review query
    const reviewQuery: any = {
      course: { $in: courseIds },
      status: "published",
    };

    if (rating) {
      const ratingNum = parseInt(rating);
      if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
        reviewQuery.rating = ratingNum;
      }
    }

    const [reviews, total] = await Promise.all([
      ReviewModel.find(reviewQuery)
        .populate("student", "firstName lastName avatar")
        .populate("course", "title thumbnail")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments(reviewQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Instructor reviews fetched successfully",
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
