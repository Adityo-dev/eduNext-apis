import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import LiveSessionModel from "../../models/liveSessionModel.js";

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
