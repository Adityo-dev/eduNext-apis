import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import createHttpError from "http-errors";
import { ReviewModel } from "../../models/reviewModel.js";

export const getCourseReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    if (!Types.ObjectId.isValid(courseId)) {
      return next(createHttpError(400, "Invalid courseId"));
    }

    const courseObjId = new Types.ObjectId(courseId);

    const [reviews, statsRaw] = await Promise.all([
      ReviewModel.find({
        course: courseObjId,
        status: "published",
      })
        .populate("student", "firstName lastName avatar")
        .sort({ createdAt: -1 }),
      ReviewModel.aggregate([
        { $match: { course: courseObjId, status: "published" } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = statsRaw[0] || {
      totalReviews: 0,
      averageRating: 0,
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 0,
    };

    const formattedStats = {
      averageRating: Math.round(stats.averageRating * 10) / 10,
      totalReviews: stats.totalReviews,
      starDistribution: {
        "1": stats.star1,
        "2": stats.star2,
        "3": stats.star3,
        "4": stats.star4,
        "5": stats.star5,
      },
      starPercentage: {
        "1": stats.totalReviews > 0 ? Math.round((stats.star1 / stats.totalReviews) * 100) : 0,
        "2": stats.totalReviews > 0 ? Math.round((stats.star2 / stats.totalReviews) * 100) : 0,
        "3": stats.totalReviews > 0 ? Math.round((stats.star3 / stats.totalReviews) * 100) : 0,
        "4": stats.totalReviews > 0 ? Math.round((stats.star4 / stats.totalReviews) * 100) : 0,
        "5": stats.totalReviews > 0 ? Math.round((stats.star5 / stats.totalReviews) * 100) : 0,
      },
    };

    res.status(200).json({
      success: true,
      message: "Course reviews fetched successfully",
      data: {
        stats: formattedStats,
        reviews: reviews,
        total: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
