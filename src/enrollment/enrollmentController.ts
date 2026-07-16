import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/models/courseModel.js";
import { EnrollmentModel } from "./enrollmentModel.js";
import { ProgressModel } from "../progress/models/progressModel.js";

// ─── 1. Enroll In Course
export const enrollInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.body;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!studentId) {
      return next(createHttpError(401, "Student authentication failed"));
    }

    // check course Published
    const course = await CourseModel.findById(courseId);
    if (!course || course.status !== "published") {
      return next(
        createHttpError(404, "Course not found or not published yet"),
      );
    }

    // Check Already Enrolled Or not
    const alreadyEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyEnrolled) {
      return next(
        createHttpError(400, "You have already enrolled in this course"),
      );
    }

    // enrollment
    const enrollment = await EnrollmentModel.create({
      student: studentId,
      course: courseId,
      pricePaid: course.price,
      paymentStatus: "completed",
    });

    await CourseModel.findByIdAndUpdate(courseId, {
      $inc: { enrolledCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in the course",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Get My Enrolled Courses
export const getMyEnrolledCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // Fetch enrollments with enhanced course & instructor data
    const enrollments = await EnrollmentModel.find({ student: studentId })
      .populate({
        path: "course",
        select: "title thumbnail category lessonsCount totalDuration rating",
        populate: { path: "instructor", select: "firstName lastName avatar" },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch all progress records for this student
    const progresses = await ProgressModel.find({ student: studentId }).lean();

    // Map progress data for easy lookup
    const progressMap = new Map();
    progresses.forEach((p: any) => {
      progressMap.set(p.course.toString(), p);
    });

    // Format the response to perfectly match the UI design
    const formattedCourses = enrollments.map((e: any) => {
      const course = e.course;
      const progress = progressMap.get(course._id.toString());

      const totalLessons = course.lessonsCount || 0;
      const completedLessonsCount = progress
        ? progress.completedLessons.length
        : 0;
      const percentage =
        totalLessons > 0
          ? Math.round((completedLessonsCount / totalLessons) * 100)
          : 0;
      const isCourseCompleted = progress ? progress.isCourseCompleted : false;

      return {
        enrollmentId: e._id,
        enrolledAt: e.createdAt,
        course: {
          _id: course._id,
          title: course.title,
          thumbnail: course.thumbnail,
          category: course.category,
          lessonsCount: totalLessons,
          totalDuration: course.totalDuration,
          rating: course.rating,
          instructor: course.instructor,
        },
        progress: {
          completedLessonsCount,
          percentage,
          isCourseCompleted,
          status: isCourseCompleted ? "Completed" : "In Progress",
          lastActivityAt: progress?.updatedAt || e.createdAt,
        },
      };
    });

    res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      data: formattedCourses,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Get Student Stats
export const getMyStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // Total Enrolled
    const totalEnrolled = await EnrollmentModel.countDocuments({
      student: studentId,
    });

    // Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });

    let completed = 0;
    progresses.forEach((p) => {
      if (p.isCourseCompleted) {
        completed++;
      }
    });

    const inProgress = totalEnrolled - completed;
    const certificates = completed;

    res.status(200).json({
      success: true,
      message: "Student stats fetched successfully",
      data: {
        totalEnrolled,
        inProgress,
        completed,
        certificates,
      },
    });
  } catch (error) {
    next(error);
  }
};
