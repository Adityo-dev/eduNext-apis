import type { NextFunction, Request, Response } from "express";
import { ReviewModel } from "../../models/reviewModel.js";

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

    const raw =
      stats.length > 0
        ? stats[0]
        : { pending: 0, published: 0, rejected: 0, total: 0 };

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
