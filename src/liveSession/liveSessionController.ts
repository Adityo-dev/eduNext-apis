import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "../enrollment/enrollmentModel.js";
import LiveSessionModel from "./liveSessionModel.js";

// ─── ১. লাইভ সেশন তৈরি করা (Instructor Only) ──────────────────────────────
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

    if (!courseId || !title || !meetingLink || !startTime) {
      return next(
        createHttpError(
          400,
          "Please fill out all required fields (courseId, title, meetingLink, startTime)",
        ),
      );
    }

    // চেক করা: কোর্সটি এই ইনস্ট্রাক্টরের নিজের কিনা
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

// ─── ২. কোর্সের সব লাইভ সেশন দেখা (Enrolled Students & Instructor Only) ───
export const getCourseLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // সিকিউরিটি চেক: ইউজার যদি ইনস্ট্রাক্টর না হয়, তবে সে এই কোর্সে এনরোলড কিনা চেক করা
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

    // সেশনগুলো ডেট অনুযায়ী সিরিয়ালি আনা (সামনের সেশন আগে দেখাবে)
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

// ─── ৩. লাইভ সেশনের স্ট্যাটাস/লিংক আপডেট করা (Instructor Only) ──────────────
export const updateLiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const session = await LiveSessionModel.findOne({
      _id: sessionId,
      instructor: instructorId,
    });
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
