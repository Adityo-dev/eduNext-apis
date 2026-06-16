import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "../enrollment/enrollmentModel.js";
import LiveSessionModel from "./liveSessionModel.js";

// ─── GET STUDENT LIVE SESSIONS STATS (Dedicated) ───────────────────────────
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

// ─── GET INSTRUCTOR LIVE SESSIONS STATS
export const getInstructorLiveSessionsStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const [liveNow, upcoming, completed] = await Promise.all([
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "live",
      }),
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "upcoming",
      }),
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "completed",
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Instructor live session stats fetched successfully",
      data: {
        liveNow,
        upcoming,
        completed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 1. Create Live session (Instructor Only) ──────────────────────────────
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

// ─── 2. Get All Live Sessions For Enrolled Student Dashboard ────────────────
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

// ─── 3. Get All Live Sessions For Instructor Dashboard ─────────────────────
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

    // UI-তে "X Students Registered" দেখানোর জন্য এনরোলমেন্ট কাউন্ট পুশ করা হলো
    const sessionsWithEnrollmentCount = await Promise.all(
      sessions.map(async (session) => {
        const totalUsersRegistered = await EnrollmentModel.countDocuments({
          course: session.course?._id,
        });
        return {
          ...session.toObject(),
          totalUsersRegistered,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Instructor dashboard live sessions fetched successfully",
      data: sessionsWithEnrollmentCount,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. Get Course Specific Live Sessions ──────────────────────────────────
export const getCourseLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.params;
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

// ─── 5. Update Live session Stats And Link (Instructor Only) ───────────────
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

    const session = await LiveSessionModel.findOne({
      _id: sessionId as unknown as import("mongodb").ObjectId,
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
