import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../../course/models/courseModel.js";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import LiveSessionModel from "../../models/liveSessionModel.js";

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

    // Hide meeting link if session is not live yet and user is a student
    const sanitizedSessions = sessions.map((session) => {
      const sessionObj = session.toObject();
      if (userRole === "student" && sessionObj.status === "upcoming") {
        sessionObj.meetingLink =
          "Link will be available when the session is live";
      }
      return sessionObj;
    });

    res.status(200).json({
      success: true,
      message: "Live sessions fetched successfully",
      data: sanitizedSessions,
    });
  } catch (error) {
    next(error);
  }
};
