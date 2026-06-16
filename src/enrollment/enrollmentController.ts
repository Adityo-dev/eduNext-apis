import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "./enrollmentModel.js";

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

    const enrollments = await EnrollmentModel.find({ student: studentId })
      .populate({
        path: "course",
        select:
          "title subtitle thumbnail price category level instructor totalDuration",
        populate: { path: "instructor", select: "firstName lastName" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      data: enrollments.map((e) => e.course),
    });
  } catch (error) {
    next(error);
  }
};
