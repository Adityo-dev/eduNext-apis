import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import LiveSessionModel from "../models/liveSessionModel.js";

// ─── 1. Get All Live Sessions For Enrolled Student Dashboard
export const getStudentDashboardLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;
    const { status } = req.query;

    const enrollments = await EnrollmentModel.find({
      student: studentId,
    }).select("course");
    const enrolledCourseIds = enrollments.map(
      (enrollment) => enrollment.course,
    );

    const query: any = { course: { $in: enrolledCourseIds } };

    if (status && status !== "all") {
      query.status = status;
    }

    const sessions = await LiveSessionModel.find(query)
      .sort({ startTime: 1 })
      .populate("course", "title")
      .populate("instructor", "firstName lastName avatar");

    res.status(200).json({
      success: true,
      message: "Student dashboard live sessions fetched successfully",
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Get All Live Sessions For Instructor Dashboard
export const getInstructorDashboardLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const { status } = req.query;

    const query: any = { instructor: instructorId };

    if (status && status !== "all") {
      query.status = status;
    }

    const sessions = await LiveSessionModel.find(query)
      .sort({ startTime: 1 })
      .populate("course", "title");

    // Sessions Join Counter
    const sessionsWithJoinCount = sessions.map((session) => {
      const totalUsersRegistered = session.joinedStudents
        ? session.joinedStudents.length
        : 0;
      return {
        ...session.toObject(),
        totalUsersRegistered,
      };
    });

    res.status(200).json({
      success: true,
      message: "Instructor dashboard live sessions fetched successfully",
      data: sessionsWithJoinCount,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Get Course Specific Live Sessions
export const getCourseLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (userRole !== "admin") {
      const isInstructor = await CourseModel.findOne({
        _id: courseId,
        instructor: userId,
      });

      if (!isInstructor) {
        const isEnrolled = await EnrollmentModel.findOne({
          student: userId,
          course: courseId,
        });
        if (!isEnrolled) {
          return next(
            createHttpError(
              403,
              "You must enroll in this course to see live sessions",
            ),
          );
        }
      }
    }
    // validate sessionId to satisfy mongoose filter types
    if (!courseId || Array.isArray(courseId)) {
      return next(createHttpError(400, "Invalid courseId parameter"));
    }

    const sessions = await LiveSessionModel.find({ course: courseId })
      .sort({ startTime: 1 })
      .populate("instructor", "firstName lastName avatar");

    res.status(200).json({
      success: true,
      message: "Live sessions fetched successfully",
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};
