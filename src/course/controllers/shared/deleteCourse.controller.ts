import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../../progress/models/progressModel.js";
import CourseModel from "../../models/courseModel.js";
import { CourseViewModel } from "../../models/courseViewModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const course = await CourseModel.findById(id);

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    if (
      userRole !== "admin" &&
      course.instructor.toString() !== userId.toString()
    ) {
      return next(createHttpError(403, "Unauthorized to delete this course"));
    }

    if (
      userRole === "admin" &&
      course.status !== "draft" &&
      course.status !== "rejected"
    ) {
      return next(
        createHttpError(
          400,
          "Admins can only delete courses in 'draft' or 'rejected' status. For 'published' courses, use suspend.",
        ),
      );
    }

    // Check for active enrollments
    const enrollmentsCount = await EnrollmentModel.countDocuments({
      course: id,
    });
    if (enrollmentsCount > 0) {
      return next(
        createHttpError(
          400,
          "Cannot delete course because there are active enrollments.",
        ),
      );
    }

    await CourseModel.findByIdAndDelete(id);

    sendResponse(res, 200, true, "Course deleted successfully from EduNext");
  } catch (error) {
    next(error);
  }
};
