import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ReviewModel } from "../../models/reviewModel.js";

export const getStudentReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = req.user?._id || req.user?.id;

    const stats = await ReviewModel.aggregate([
      { $match: { student: new Types.ObjectId(studentId as string) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
        },
      },
    ]);

    const data =
      stats.length > 0 ? stats[0] : { total: 0, published: 0, pending: 0 };
    delete data._id;

    res.status(200).json({
      success: true,
      message: "Student review stats fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
