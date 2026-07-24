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
    const courses = await CourseModel.find({ status: "published" })
      .sort({ rating: -1 })
      .limit(8)
      .populate("instructor", "fullName avatar")
      .select(
        "title slug thumbnail category level language instructor rating enrolledCount totalDuration price estimatedPrice hasCertificate",
      );

    sendResponse(res, 200, true, "Top rated courses fetched successfully", {
      courses,
    });
  } catch (error) {
    next(error);
  }
};
