import type { NextFunction, Request, Response } from "express";
import CourseModel from "../../models/courseModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getInstructorCourseStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const [totalCourses, published, pending, draft, rejected, suspended] =
      await Promise.all([
        CourseModel.countDocuments({ instructor: instructorId }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "published",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "pending",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "draft",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "rejected",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "suspended",
        }),
      ]);

    sendResponse(
      res,
      200,
      true,
      "Instructor course stats fetched successfully",
      {
        totalCourses,
        published,
        pending,
        draft,
        rejected,
        suspended,
      },
    );
  } catch (error) {
    next(error);
  }
};
