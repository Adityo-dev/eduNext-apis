import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../models/progressModel.js";

// ─── 1. Mark Lesson As Complete
export const markLessonComplete = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!studentId) {
      return next(createHttpError(401, "Student authentication failed"));
    }

    // Check if course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    // Optional: Check if student is enrolled in this course
    const isEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
      paymentStatus: "completed",
    });

    if (!isEnrolled) {
      return next(createHttpError(403, "You are not enrolled in this course"));
    }

    // Verify if lesson exists in the course
    let lessonExists = false;
    for (const section of course.sections) {
      if (
        section.lessons.some(
          (lesson: any) => lesson._id.toString() === lessonId,
        )
      ) {
        lessonExists = true;
        break;
      }
    }

    if (!lessonExists) {
      return next(createHttpError(404, "Lesson not found in this course"));
    }

    // Find or create progress record
    let progress = await ProgressModel.findOne({
      student: studentId,
      course: courseId,
    });

    if (!progress) {
      progress = await ProgressModel.create({
        student: studentId,
        course: courseId,
        completedLessons: [{ lessonId, completedAt: new Date() }],
      });
    } else {
      // Add lesson if not already completed
      const lessonAlreadyCompleted = progress.completedLessons.some(
        (l: any) =>
          (l.lessonId ? l.lessonId.toString() : l.toString()) === lessonId,
      );
      if (!lessonAlreadyCompleted) {
        progress.completedLessons.push({
          lessonId: lessonId as any,
          completedAt: new Date(),
        } as any);
      }
    }

    // Check if course is fully completed
    const totalLessons = course.lessonsCount || 0;
    if (progress.completedLessons.length >= totalLessons && totalLessons > 0) {
      progress.isCourseCompleted = true;
      if (!progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    await progress.save();

    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: {
        completedLessonsCount: progress.completedLessons.length,
        totalLessons,
        isCourseCompleted: progress.isCourseCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Get Course Progress
export const getCourseProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!studentId) {
      return next(createHttpError(401, "Student authentication failed"));
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    const totalLessons = course.lessonsCount || 0;

    const progress = await ProgressModel.findOne({
      student: studentId,
      course: courseId,
    });

    const completedLessonsCount = progress
      ? progress.completedLessons.length
      : 0;
    const percentage =
      totalLessons > 0
        ? Math.round((completedLessonsCount / totalLessons) * 100)
        : 0;

    res.status(200).json({
      success: true,
      message: "Progress retrieved successfully",
      data: {
        totalLessons,
        completedLessonsCount,
        percentage,
        isCourseCompleted: progress ? progress.isCourseCompleted : false,
        completedLessons: progress
          ? progress.completedLessons.map((l: any) =>
              l.lessonId ? l.lessonId : l,
            )
          : [],
      },
    });
  } catch (error) {
    next(error);
  }
};
