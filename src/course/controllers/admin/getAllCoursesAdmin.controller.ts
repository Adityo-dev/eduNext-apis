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

export const getAllCoursesAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, search, page = "1", limit = "10" } = req.query;

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("instructor", "firstName lastName email avatar"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Admin course list fetched successfully", {
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
