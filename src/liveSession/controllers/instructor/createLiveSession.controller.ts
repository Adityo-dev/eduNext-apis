import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../../course/models/courseModel.js";
import LiveSessionModel from "../../models/liveSessionModel.js";

// ─── 1. Create Live session (Instructor Only)
export const createLiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const {
      courseId,
      title,
      description,
      meetingLink,
      meetingPlatform,
      startTime,
      durationInMins,
    } = req.body;

    if (!courseId || !title || !meetingLink || !startTime || !description) {
      return next(
        createHttpError(
          400,
          "Please fill out all required fields (courseId, title, description, meetingLink, startTime)",
        ),
      );
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      instructor: instructorId,
    });
    if (!course) {
      return next(createHttpError(403, "Unauthorized or course not found"));
    }

    const session = await LiveSessionModel.create({
      course: courseId,
      instructor: instructorId,
      title,
      description,
      meetingLink,
      meetingPlatform,
      startTime: new Date(startTime),
      durationInMins: Number(durationInMins) || 60,
    });

    res.status(201).json({
      success: true,
      message: "Live session scheduled successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
