import type { NextFunction, Request, Response } from "express";
import { ReviewModel } from "../models/reviewModel.js";

// ─── Get All Published Reviews For A Course (Public — No Auth Required)
export const getCourseReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.params;

    const reviews = await ReviewModel.find({
      course: courseId,
      status: "published",
    })
      .populate("student", "firstName lastName avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Course reviews fetched successfully",
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
