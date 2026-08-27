import type { NextFunction, Request, Response } from "express";
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

export const getTopRatedCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    const query: any = { status: "published" };

    if (category && category !== "All") {
      query.category = category;
    }

    const courses = await CourseModel.find(query)
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit)
      .populate("instructor", "fullName avatar")
      .select(
        "title slug thumbnail category subCategory level language instructor rating enrolledCount totalDuration price estimatedPrice hasCertificate",
      );

    const totalCourses = await CourseModel.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / limit);

    sendResponse(res, 200, true, "Top rated courses fetched successfully", {
      courses,
      pagination: {
        totalCourses,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};
