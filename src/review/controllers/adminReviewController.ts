import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import CourseModel from "../../course/courseModel.js";
import { ReviewModel } from "../models/reviewModel.js";

// ─── 1. Get All Pending Reviews (Admin Only)
export const getAllPendingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviews = await ReviewModel.find({ status: "pending" })
      .populate("student", "firstName lastName avatar email")
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Pending reviews fetched successfully",
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Publish a Review (Admin Only)
export const publishReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId as string;

    if (!Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, "Invalid reviewId"));
    }

    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return next(createHttpError(404, "Review not found"));
    }

    if (review.status === "published") {
      return next(createHttpError(400, "Review is already published"));
    }

    review.status = "published";
    review.rejectionReason = undefined;
    await review.save();

    // Recalculate course average rating from published reviews only
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
      message: "Review published successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Reject a Review (Admin Only)
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
        createHttpError(400, "Rejection reason is required when rejecting a review"),
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
