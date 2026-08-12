import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../progress/models/progressModel.js";
import AuthModel from "../../auth/models/authModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getStudentWelcome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as any).user;
    const studentId = user?._id || user?.id;
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const studentDoc =
      await AuthModel.findById(studentId).select("fullName firstName");
    const name = studentDoc?.fullName || studentDoc?.firstName || "Student";

    // 1. In Progress Courses Count
    const totalEnrolled = await EnrollmentModel.countDocuments({
      student: studentObjectId,
    });

    // We populate course to also get resumeCourse data
    const progresses = await ProgressModel.find({ student: studentObjectId })
      .populate({
        path: "course",
        select: "title thumbnail",
      })
      .sort({ updatedAt: -1 }); // Sort by most recently updated

    let completed = 0;
    let resumeCourse = null;

    if (progresses.length > 0) {
      progresses.forEach((p) => {
        if (p.isCourseCompleted) {
          completed++;
        }
      });
      // The first one in the sorted list that is NOT completed is the best to resume.
      // If all are completed, we can just suggest the first one anyway, or leave it null.
      const lastActiveProgress =
        progresses.find((p) => !p.isCourseCompleted) || progresses[0];
      if (lastActiveProgress && lastActiveProgress.course) {
        resumeCourse = {
          courseId: (lastActiveProgress.course as any)._id,
          title: (lastActiveProgress.course as any).title,
          thumbnail: (lastActiveProgress.course as any).thumbnail,
        };
      }
    }

    const inProgressCount = Math.max(0, totalEnrolled - completed);

    // 2. Calculate Current Streak & This Week Hours
    const uniqueDates = new Set<string>();

    // Determine current week's Monday and Sunday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let thisWeekSeconds = 0;

    // We need the full course data to get lesson durations for 'thisWeekHours'
    const courseIds = progresses.map((p) => (p.course as any)._id);
    const fullCourses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    fullCourses.forEach((c) => courseMap.set(c._id.toString(), c));

    progresses.forEach((p) => {
      const course = courseMap.get((p.course as any)._id.toString());
      if (p.completedLessons && p.completedLessons.length > 0) {
        p.completedLessons.forEach((cl: any) => {
          if (cl.completedAt) {
            // Streak logic
            const dateStr = new Date(cl.completedAt)
              .toISOString()
              .split("T")[0];
            if (dateStr) uniqueDates.add(dateStr);

            // This week hours logic
            const compDate = new Date(cl.completedAt);
            if (compDate >= monday && compDate <= sunday && course) {
              // Find the lesson duration
              course.sections?.forEach((section: any) => {
                section.lessons?.forEach((lesson: any) => {
                  if (
                    lesson._id.toString() ===
                    (cl.lessonId ? cl.lessonId.toString() : cl.toString())
                  ) {
                    if (lesson.duration) {
                      const parts = lesson.duration.split(":").map(Number);
                      if (parts.length === 2) {
                        thisWeekSeconds += parts[0] * 60 + parts[1];
                      } else if (parts.length === 3) {
                        thisWeekSeconds +=
                          parts[0] * 3600 + parts[1] * 60 + parts[2];
                      } else if (parts.length === 1 && !isNaN(parts[0])) {
                        thisWeekSeconds += parts[0] * 60;
                      }
                    }
                  }
                });
              });
            }
          }
        });
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const todayDate = new Date();
    const todayStrStr = todayDate.toISOString().split("T")[0];

    let checkDateObj = new Date(todayDate);
    let checkDateStrStr = checkDateObj.toISOString().split("T")[0];

    if (todayStrStr && uniqueDates.has(todayStrStr)) {
      while (checkDateStrStr && uniqueDates.has(checkDateStrStr)) {
        currentStreak++;
        checkDateObj.setDate(checkDateObj.getDate() - 1);
        checkDateStrStr = checkDateObj.toISOString().split("T")[0];
      }
    } else {
      checkDateObj.setDate(checkDateObj.getDate() - 1);
      checkDateStrStr = checkDateObj.toISOString().split("T")[0];
      if (checkDateStrStr && uniqueDates.has(checkDateStrStr)) {
        while (checkDateStrStr && uniqueDates.has(checkDateStrStr)) {
          currentStreak++;
          checkDateObj.setDate(checkDateObj.getDate() - 1);
          checkDateStrStr = checkDateObj.toISOString().split("T")[0];
        }
      }
    }

    const thisWeekHours = Math.round((thisWeekSeconds / 3600) * 10) / 10;
    const thisWeekMinutes = Math.round(thisWeekSeconds / 60);

    const h = Math.floor(thisWeekMinutes / 60);
    const m = thisWeekMinutes % 60;
    let thisWeekTimeText = "0h";
    if (h > 0 && m > 0) thisWeekTimeText = `${h}h ${m}m`;
    else if (h > 0) thisWeekTimeText = `${h}h`;
    else if (m > 0) thisWeekTimeText = `${m}m`;

    let motivationalMessage = "Keep going!";
    if (currentStreak >= 7) {
      motivationalMessage = "You're on fire! Keep your streak alive!";
    } else if (inProgressCount > 0) {
      motivationalMessage = `You have ${inProgressCount} course${inProgressCount > 1 ? "s" : ""} in progress. Keep going!`;
    } else {
      motivationalMessage = "Ready to start a new course?";
    }

    sendResponse(res, 200, true, "Student welcome data fetched successfully", {
      studentName: name,
      motivationalMessage,
      inProgressCount,
      currentStreak,
      thisWeekHours,
      thisWeekTimeText,
      resumeCourse,
    });
  } catch (error) {
    next(error);
  }
};
