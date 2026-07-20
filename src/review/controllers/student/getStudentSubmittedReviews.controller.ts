import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ReviewModel } from "../../models/reviewModel.js";

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
