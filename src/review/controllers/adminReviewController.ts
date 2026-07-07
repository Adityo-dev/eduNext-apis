import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import AuthModel from "../../auth/models/authModel.js";
import CourseModel from "../../course/courseModel.js";
import { ReviewModel } from "../models/reviewModel.js";


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

// ─── 4. Get Admin Review Stats (Admin Only)
export const getAdminReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await ReviewModel.aggregate([
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const raw = stats.length > 0 ? stats[0] : { pending: 0, published: 0, rejected: 0, total: 0 };

    res.status(200).json({
      success: true,
      message: "Admin review stats fetched successfully",
      data: {
        total: raw.total,
        pending: raw.pending,
        published: raw.published,
        rejected: raw.rejected,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 5. Get All Pending Reviews with Pagination (Admin Only)
export const getAllPendingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ status: "pending" })
        .populate("student", "firstName lastName avatar email")
        .populate("course", "title thumbnail")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments({ status: "pending" }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Pending reviews fetched successfully",
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

// ─── 6. Get All Reviews with Filters and Pagination (Admin Only)
export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Normalize status and search
    const rawStatus = (req.query.status as string | undefined)?.trim().toLowerCase();
    const search = (req.query.search as string | undefined)?.trim();

    const statusMap: Record<string, string> = {
      approved: "published",
      published: "published",
      pending: "pending",
      rejected: "rejected",
    };

    // Build conditions array for $and
    const andConditions: any[] = [];

    // Status filter
    if (rawStatus && rawStatus !== "all" && statusMap[rawStatus]) {
      andConditions.push({ status: statusMap[rawStatus] });
    }

    // Search filter — only apply if search string is non-empty
    if (search && search.length > 0) {
      const searchRegex = new RegExp(search, "i");

      const [matchedUsers, matchedCourses] = await Promise.all([
        AuthModel.find({
          $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
        }).select("_id"),
        CourseModel.find({ title: searchRegex }).select("_id"),
      ]);

      const userIds = matchedUsers.map((u) => u._id);
      const courseIds = matchedCourses.map((c) => c._id);

      // ⚠️ Only add search condition if at least one match exists
      // Empty $in arrays in $or cause MongoDB to match NOTHING
      if (userIds.length > 0 || courseIds.length > 0) {
        const searchOr: any[] = [];
        if (userIds.length > 0) searchOr.push({ student: { $in: userIds } });
        if (courseIds.length > 0) searchOr.push({ course: { $in: courseIds } });
        andConditions.push({ $or: searchOr });
      } else {
        // Search term matched nothing — return empty immediately
        res.status(200).json({
          success: true,
          message: "Reviews fetched successfully",
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
        return;
      }
    }

    // Build final query
    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const [reviews, total] = await Promise.all([
      ReviewModel.find(query)
        .populate("student", "firstName lastName avatar email")
        .populate("course", "title thumbnail")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ─── 7. Delete a Review (Admin Only)
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

      const newAverageRating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
      await CourseModel.findByIdAndUpdate(review.course, { rating: newAverageRating });
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
