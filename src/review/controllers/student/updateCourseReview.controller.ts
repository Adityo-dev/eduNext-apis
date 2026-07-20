import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import { ReviewModel } from "../../models/reviewModel.js";

export const updateCourseReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId as string;
    const { rating, comment } = req.body;
    const rawStudentId = req.user?._id || req.user?.id;

    if (!Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, "Invalid reviewId"));
    }

    if (!Types.ObjectId.isValid(rawStudentId)) {
      return next(createHttpError(401, "Invalid or missing student identity"));
    }

    const studentId = new Types.ObjectId(rawStudentId);

    const review = await ReviewModel.findOne({
      _id: reviewId,
      student: studentId,
    });
    if (!review) {
      return next(
        createHttpError(404, "Review not found or you are not authorized"),
      );
    }

    if (rating) review.rating = Number(rating);
    if (comment) review.comment = comment;

    review.status = "pending";

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully. It is now pending approval.",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
