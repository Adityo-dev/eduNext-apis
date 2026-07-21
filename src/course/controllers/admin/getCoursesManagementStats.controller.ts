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

export const getCoursesManagementStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [totalCourses, published, pending, rejected] = await Promise.all([
      CourseModel.countDocuments(),
      CourseModel.countDocuments({ status: "published" }),
      CourseModel.countDocuments({ status: "pending" }),
      CourseModel.countDocuments({ status: "rejected" }),
    ]);

    res.status(200).json({
      success: true,
      message: "User management stats fetched successfully",
      data: {
        totalCourses,
        published,
        pending,
        rejected,
      },
    });
  } catch (error) {
    next(error);
  }
};
