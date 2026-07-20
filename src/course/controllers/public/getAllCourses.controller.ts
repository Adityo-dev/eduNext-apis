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

export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      search,
      category,
      level,
      language,
      minPrice,
      maxPrice,
      rating,
      certificate,
      sort = "Most Popular",
      page = "1",
      limit = "12",
    } = req.query;

    const filter: Record<string, unknown> = { status: "published" };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (language) filter.language = language;
    if (certificate === "true") filter.hasCertificate = true;
    if (rating) filter.rating = { $gte: Number(rating) };

    if (minPrice || maxPrice) {
      filter.price = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
      };
    }

    const sortMap: Record<string, Record<string, number>> = {
      "Most Popular": { enrolledCount: -1 },
      "Highest Rated": { rating: -1 },
      Newest: { createdAt: -1 },
      "Price: Low to High": { price: 1 },
      "Price: High to Low": { price: -1 },
    };

    const sortOption = sortMap[sort as string] || { enrolledCount: -1 };

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort(sortOption as any)
        .skip(skip)
        .limit(limitNum)
        .populate("instructor", "firstName lastName email avatar")
        .select("-sections -totalViews"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Courses fetched successfully", {
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
