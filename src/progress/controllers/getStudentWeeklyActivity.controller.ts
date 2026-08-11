import type { NextFunction, Request, Response } from "express";
import { ProgressModel } from "../models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentWeeklyActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // Determine current week's Monday and Sunday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Initialize days map (Mon to Sun)
    const weekStats = [
      { day: "Mon", hours: 0 },
      { day: "Tue", hours: 0 },
      { day: "Wed", hours: 0 },
      { day: "Thu", hours: 0 },
      { day: "Fri", hours: 0 },
      { day: "Sat", hours: 0 },
      { day: "Sun", hours: 0 },
    ];

    const progresses = await ProgressModel.find({ student: studentId });
    const courseIds = progresses.map((p) => p.course);

    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    courses.forEach((c) => courseMap.set(c._id.toString(), c));

    progresses.forEach((p) => {
      const course = courseMap.get(p.course.toString());
      if (course && p.completedLessons && p.completedLessons.length > 0) {
        course.sections?.forEach((section: any) => {
          section.lessons?.forEach((lesson: any) => {
            const completedItem = p.completedLessons.find(
              (l: any) =>
                (l.lessonId ? l.lessonId.toString() : l.toString()) ===
                lesson._id.toString(),
            );

            if (completedItem && completedItem.completedAt) {
              const compDate = new Date(completedItem.completedAt);
              if (compDate >= monday && compDate <= sunday && lesson.duration) {
                // Parse duration
                let seconds = 0;
                const parts = lesson.duration.split(":").map(Number);
                if (parts.length === 2) {
                  seconds = parts[0] * 60 + parts[1];
                } else if (parts.length === 3) {
                  seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                  seconds = parts[0] * 60;
                }

                // Add to specific day
                const dayIdx = compDate.getDay();
                const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;

                if (weekStats[mappedIdx]) {
                  weekStats[mappedIdx].hours += seconds / 3600;
                }
              }
            }
          });
        });
      }
    });

    // Format hours to 1 decimal place max (e.g. 2.5)
    const formattedStats = weekStats.map((stat) => ({
      day: stat.day,
      hours: Math.round(stat.hours * 10) / 10,
    }));

    res.status(200).json({
      success: true,
      message: "Student weekly activity fetched successfully",
      data: formattedStats,
    });
  } catch (error) {
    next(error);
  }
};
