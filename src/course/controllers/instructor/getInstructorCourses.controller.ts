import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../../progress/models/progressModel.js";
import CourseModel from "../../models/courseModel.js";
import { CourseViewModel } from "../../models/courseViewModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getInstructorCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const { status, page = "1", limit = "10" } = req.query;

    const filter: Record<string, unknown> = { instructor: instructorId };
    if (status && status !== "all") filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-sections"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Instructor courses fetched successfully", {
      courses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};
