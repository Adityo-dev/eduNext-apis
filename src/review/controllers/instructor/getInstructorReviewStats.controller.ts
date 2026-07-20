import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const getInstructorReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = new Types.ObjectId(req.user?._id || req.user?.id);

    // Get all courses owned by this instructor
    const instructorCourses = await CourseModel.find({
      instructor: instructorId,
    }).select("_id");
    const courseIds = instructorCourses.map((c) => c._id);

    if (courseIds.length === 0) {
      res.status(200).json({
        success: true,
        message: "Instructor review stats fetched successfully",
        data: {
          averageRating: 0,
          totalReviews: 0,
          starDistribution: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          },
        },
      });
      return;
    }

    // Aggregate published reviews for star distribution and overall true average rating
    const stats = await ReviewModel.aggregate([
      { $match: { course: { $in: courseIds }, status: "published" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const distribution =
      stats.length > 0
        ? stats[0]
        : {
            total: 0,
            avgRating: 0,
            star5: 0,
            star4: 0,
            star3: 0,
            star2: 0,
            star1: 0,
          };

    const averageRating =
      distribution.total > 0 ? Math.round(distribution.avgRating * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      message: "Instructor review stats fetched successfully",
      data: {
        averageRating,
        totalReviews: distribution.total,
        starDistribution: {
          5: distribution.star5,
          4: distribution.star4,
          3: distribution.star3,
          2: distribution.star2,
          1: distribution.star1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
