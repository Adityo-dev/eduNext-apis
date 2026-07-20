import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const rejectReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId as string;
    const { rejectionReason } = req.body;

    if (!Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, "Invalid reviewId"));
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return next(
        createHttpError(
          400,
          "Rejection reason is required when rejecting a review",
        ),
      );
    }

    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return next(createHttpError(404, "Review not found"));
    }

    if (review.status === "rejected") {
      return next(createHttpError(400, "Review is already rejected"));
    }

    review.status = "rejected";
    review.rejectionReason = rejectionReason.trim();
    await review.save();

    // Recalculate course average rating — exclude this review
    const stats = await ReviewModel.aggregate([
      { $match: { course: review.course, status: "published" } },
      { $group: { _id: "$course", avgRating: { $avg: "$rating" } } },
    ]);

    const newAverageRating =
      stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;

    await CourseModel.findByIdAndUpdate(review.course, {
      rating: newAverageRating,
    });

    res.status(200).json({
      success: true,
      message: "Review rejected successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
