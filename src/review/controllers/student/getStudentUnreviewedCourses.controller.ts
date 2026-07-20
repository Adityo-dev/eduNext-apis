import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../../models/reviewModel.js";

export const getStudentUnreviewedCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = new Types.ObjectId(req.user?._id || req.user?.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    // Get all courses the student has reviewed
    const reviewedCourses = await ReviewModel.find({
      student: studentId,
    }).distinct("course");

    // Find enrollments where the course is not in the reviewedCourses list
    const [enrollments, total] = await Promise.all([
      EnrollmentModel.find({
        student: studentId,
        course: { $nin: reviewedCourses },
      })
        .populate({
          path: "course",
          select: "title thumbnail instructor",
          populate: { path: "instructor", select: "firstName lastName" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EnrollmentModel.countDocuments({
        student: studentId,
        course: { $nin: reviewedCourses },
      }),
    ]);

    // Extract course data from enrollments
    const courses = enrollments.map((e) => e.course);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Unreviewed courses fetched successfully",
      data: courses,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};
