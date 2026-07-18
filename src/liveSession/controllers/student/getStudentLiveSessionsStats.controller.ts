import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import LiveSessionModel from "../../models/liveSessionModel.js";

// ─── 1. GET STUDENT LIVE SESSIONS STATS (Dedicated)
export const getStudentLiveSessionsStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    const enrollments = await EnrollmentModel.find({
      student: studentId,
    }).select("course");
    const enrolledCourseIds = enrollments.map(
      (enrollment) => enrollment.course,
    );

    const [liveNow, upcoming, attended] = await Promise.all([
      LiveSessionModel.countDocuments({
        course: { $in: enrolledCourseIds },
        status: "live",
      }),
      LiveSessionModel.countDocuments({
        course: { $in: enrolledCourseIds },
        status: "upcoming",
      }),
      LiveSessionModel.countDocuments({
        course: { $in: enrolledCourseIds },
        status: "completed",
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Student live session stats fetched successfully",
      data: {
        liveNow,
        upcoming,
        attended,
      },
    });
  } catch (error) {
    next(error);
  }
};
