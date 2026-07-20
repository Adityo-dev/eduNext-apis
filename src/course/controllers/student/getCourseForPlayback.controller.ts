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

export const getCourseForPlayback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.id as string;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return next(createHttpError(401, "Authentication required"));
    }

    const course = await CourseModel.findById(courseId).select(
      "title slug sections lessonsCount totalDuration hasCertificate",
    );

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    // Check Access (Admin, Instructor, or Enrolled Student)
    let hasAccess = false;
    const instructorId = course.instructor?.toString();

    if (userRole === "admin" || userId.toString() === instructorId) {
      hasAccess = true;
    } else {
      const enrollment = await EnrollmentModel.findOne({
        course: courseId,
        student: userId,
        paymentStatus: "completed",
      });
      if (enrollment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return next(
        createHttpError(
          403,
          `You must be enrolled in this course to access the playback dashboard (courseId: ${courseId}, studentId: ${userId})`,
        ),
      );
    }

    // Fetch User Progress
    const progress = await ProgressModel.findOne({
      course: courseId,
      student: userId,
    });

    const completedLessons = progress ? progress.completedLessons : [];
    const isCourseCompleted = progress ? progress.isCourseCompleted : false;
    const completedLessonsCount = completedLessons.length;
    const totalLessons = course.lessonsCount || 0;
    const percentage =
      totalLessons > 0
        ? Math.round((completedLessonsCount / totalLessons) * 100)
        : 0;

    res.status(200).json({
      success: true,
      message: "Course playback data fetched successfully",
      data: {
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          totalDuration: course.totalDuration,
          lessonsCount: course.lessonsCount,
          hasCertificate: course.hasCertificate,
          sections: course.sections,
        },
        progress: {
          completedLessons,
          completedLessonsCount,
          percentage,
          isCourseCompleted,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
