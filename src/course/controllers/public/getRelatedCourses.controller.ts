import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../models/courseModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getRelatedCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    // 1. Find the base course to get its category
    const baseCourse = await CourseModel.findOne({ slug, status: "published" }).select("category _id");

    if (!baseCourse) {
      return next(createHttpError(404, "Course not found"));
    }

    // 2. Find related courses in the same category, excluding the base course
    const relatedCourses = await CourseModel.find({
      category: baseCourse.category,
      _id: { $ne: baseCourse._id },
      status: "published",
    })
      .select("-sections -whatYouLearn -requirements -totalViews -rejectedReason -suspendedReason")
      .populate("instructor", "fullName avatar bio")
      .sort({ rating: -1, enrolledCount: -1 })
      .limit(4);

    sendResponse(res, 200, true, "Related courses fetched successfully", {
      courses: relatedCourses,
    });
  } catch (error) {
    next(error);
  }
};
