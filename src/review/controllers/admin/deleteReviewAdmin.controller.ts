import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const deleteReviewAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId as string;
    const { reason } = req.body;

    if (!Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, "Invalid reviewId"));
    }

    const review = await ReviewModel.findByIdAndDelete(reviewId);
    if (!review) {
      return next(createHttpError(404, "Review not found"));
    }

    // Recalculate course rating if the deleted review was published
    if (review.status === "published") {
      const stats = await ReviewModel.aggregate([
        { $match: { course: review.course, status: "published" } },
        { $group: { _id: "$course", avgRating: { $avg: "$rating" } } },
      ]);

      const newAverageRating =
        stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
      await CourseModel.findByIdAndUpdate(review.course, {
        rating: newAverageRating,
      });
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
