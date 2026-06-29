import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import cron from "node-cron";
import CourseModel from "../course/courseModel.js";
import { EnrollmentModel } from "../enrollment/enrollmentModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import LiveSessionModel from "./liveSessionModel.js";

// ─── CRON JOB: AUTOMATIC STATS UPDATE & NOTIFICATION SYSTEM
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    await LiveSessionModel.updateMany(
      { startTime: { $lte: now }, status: "upcoming" },
      { $set: { status: "live" } },
    );

    const sessionsToComplete = await LiveSessionModel.find({ status: "live" });
    for (const session of sessionsToComplete) {
      const endTime = new Date(
        session.startTime.getTime() + session.durationInMins * 60000,
      );
      if (now >= endTime) {
        session.status = "completed";
        await session.save();
      }
    }

    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000);
    const upcomingSessions = await LiveSessionModel.find({
      startTime: { $lte: fifteenMinutesFromNow, $gt: now },
      status: "upcoming",
      isReminderSent: false,
    }).populate("instructor", "firstName lastName");

    for (const session of upcomingSessions) {
      //  Find Enrollment Student
      const enrollments = await EnrollmentModel.find({
        course: session.course,
      }).populate("student", "email firstName");

      const instructorName =
        (session.instructor as any)?.firstName || "Instructor";

      for (const enrollment of enrollments) {
        const student = enrollment.student as any;
        if (student?.email) {
          const emailHtml = `
            <div style="background-color: #F9FAFB; padding: 40px 10px; font-family: sans-serif;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #E5E7EB;">
                <h2 style="color: #4F46E5; text-align: center;">EduNext Live Class Reminder</h2>
                <p style="font-size: 16px; color: #374151;">Hello ${student.firstName || "Student"},</p>
                <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">Your live session <strong>"${session.title}"</strong> by <strong>${instructorName}</strong> is starting in 15 minutes!</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${session.meetingLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Join Live Session Now</a>
                </div>
                <p style="font-size: 13px; color: #6B7280;">Platform: ${session.meetingPlatform} | Duration: ${session.durationInMins} mins</p>
              </div>
            </div>
          `;

          sendEmail({
            email: student.email,
            subject: `⏰ Live Class Starting Soon: ${session.title}`,
            html: emailHtml,
          }).catch((err) =>
            console.error(`Failed sending reminder to ${student.email}`, err),
          );
        }
      }

      session.isReminderSent = true;
      await session.save();
    }
  } catch (error) {
    console.error("Error in Live Session Cron Job:", error);
  }
});

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

// ─── 4. Get Course Specific Live Sessions ──────────────────────────────────
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

// ─── 6. Join Live Session (Student Only) ──────────────────────────────────
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
