import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import LiveSessionModel from "../models/liveSessionModel.js";

// ─── 1. Join Live Session (Student Only)
export const joinLiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!sessionId || Array.isArray(sessionId)) {
      return next(createHttpError(400, "Invalid sessionId parameter"));
    }

    const session = await LiveSessionModel.findById(sessionId);
    if (!session) {
      return next(createHttpError(404, "Live session not found"));
    }

    // Verify if student is enrolled in the course
    const isEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: session.course,
    });

    if (!isEnrolled) {
      return next(
        createHttpError(
          403,
          "You must enroll in this course to join the live session",
        ),
      );
    }

    // Add student to joinedStudents array using $addToSet (prevents duplicates)
    await LiveSessionModel.findByIdAndUpdate(sessionId, {
      $addToSet: { joinedStudents: studentId },
    });

    res.status(200).json({
      success: true,
      message: "Successfully joined live session",
    });
  } catch (error) {
    next(error);
  }
};
