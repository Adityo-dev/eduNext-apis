import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../course/models/courseModel.js";
import LiveSessionModel from "../models/liveSessionModel.js";

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

// ─── 2. Update Live session Stats And Link (Instructor Only)
export const updateLiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    // validate sessionId to satisfy mongoose filter types
    if (!sessionId || Array.isArray(sessionId)) {
      return next(createHttpError(400, "Invalid sessionId parameter"));
    }

    const queryFilter: any = {
      _id: sessionId,
      instructor: instructorId,
    };

    const session = await LiveSessionModel.findOne(queryFilter);
    if (!session) {
      return next(
        createHttpError(404, "Live session not found or unauthorized"),
      );
    }

    const allowedUpdates = [
      "title",
      "description",
      "meetingLink",
      "meetingPlatform",
      "startTime",
      "durationInMins",
      "status",
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "startTime") {
          session.startTime = new Date(req.body.startTime);
          session.isReminderSent = false;
        } else {
          (session as any)[key] = req.body[key];
        }
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Live session updated successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
