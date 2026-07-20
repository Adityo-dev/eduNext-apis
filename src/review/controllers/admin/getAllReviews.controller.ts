import type { NextFunction, Request, Response } from "express";
import AuthModel from "../../../auth/models/authModel.js";
import CourseModel from "../../../course/models/courseModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    // Normalize status and search
    const rawStatus = (req.query.status as string | undefined)
      ?.trim()
      .toLowerCase();
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
