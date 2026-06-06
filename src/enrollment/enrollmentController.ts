import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "./enrollmentModel.js";

// ─── ১. কোর্স এনরোল করা (Enroll/Buy Course)
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

    // কোর্সটি আসলেই এক্সিস্ট করে কিনা চেক করা
    const course = await CourseModel.findById(courseId);
    if (!course || course.status !== "published") {
      return next(
        createHttpError(404, "Course not found or not published yet"),
      );
    }

    // অলরেডি এনরোলড কিনা চেক করা
    const alreadyEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyEnrolled) {
      return next(
        createHttpError(400, "You have already enrolled in this course"),
      );
    }

    // এনরোলমেন্ট তৈরি করা (এখানে পেমেন্ট গেটওয়ের সাকসেস রেসপন্সের পর এই ডেটা সেভ হবে)
    const enrollment = await EnrollmentModel.create({
      student: studentId,
      course: courseId,
      pricePaid: course.price,
      paymentStatus: "completed",
    });

    // কোর্সের enrolledCount ১ বাড়িয়ে দেওয়া
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

// ─── ২. স্টুডেন্টের নিজের এনরোল করা কোর্সগুলোর লিস্ট
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
      data: enrollments.map((e) => e.course), // শুধু কোর্সের ডিটেইলস ফ্রন্টএন্ডে পাঠানোর জন্য
    });
  } catch (error) {
    next(error);
  }
};
