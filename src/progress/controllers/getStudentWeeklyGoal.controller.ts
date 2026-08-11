import type { NextFunction, Request, Response } from "express";
import { ProgressModel } from "../models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentWeeklyGoal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;
    const weeklyGoalHours = 5; // 5 hours per week

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all progress documents that have lessons completed this week
    const allProgresses = await ProgressModel.find({
      "completedLessons.completedAt": { $gte: sevenDaysAgo },
    });

    // Get all relevant course IDs to fetch lesson durations
    const allCourseIds = [
      ...new Set(allProgresses.map((p) => p.course.toString())),
    ];
    const courses = await CourseModel.find({ _id: { $in: allCourseIds } });

    // Build a map: lessonId -> duration in seconds
    const lessonDurationMap = new Map<string, number>();
    courses.forEach((course) => {
      course.sections?.forEach((section: any) => {
        section.lessons?.forEach((lesson: any) => {
          if (lesson.duration) {
            let seconds = 0;
            const parts = lesson.duration.split(":").map(Number);
            if (parts.length === 2) {
              seconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 1 && !isNaN(parts[0])) {
              seconds = parts[0] * 60;
            }
            lessonDurationMap.set(lesson._id.toString(), seconds);
          }
        });
      });
    });

    // Calculate hours learned this week for each student
    const studentHoursMap = new Map<string, number>();

    allProgresses.forEach((p) => {
      const sId = p.student.toString();

      p.completedLessons.forEach((cl: any) => {
        if (cl.completedAt && new Date(cl.completedAt) >= sevenDaysAgo) {
          const lessonId = cl.lessonId ? cl.lessonId.toString() : cl.toString();
          const durationSeconds = lessonDurationMap.get(lessonId) || 0;
          const currentTotal = studentHoursMap.get(sId) || 0;
          studentHoursMap.set(sId, currentTotal + durationSeconds);
        }
      });
    });

    // Sort students by hours learned (descending)
    const sortedStudents = [...studentHoursMap.entries()]
      .map(([id, seconds]) => ({ studentId: id, hoursLearned: seconds / 3600 }))
      .sort((a, b) => b.hoursLearned - a.hoursLearned);

    // Find current student's data
    const myStudentId = studentId.toString();
    const myData = sortedStudents.find((s) => s.studentId === myStudentId);
    const myHours = myData ? myData.hoursLearned : 0;

    // Calculate rank with tie handling
    let myRank = -1;
    let currentRank = 1;
    for (let i = 0; i < sortedStudents.length; i++) {
      if (
        i > 0 &&
        sortedStudents[i]!.hoursLearned < sortedStudents[i - 1]!.hoursLearned
      ) {
        currentRank = i + 1;
      }
      if (sortedStudents[i]!.studentId === myStudentId) {
        myRank = currentRank;
        break;
      }
    }

    // Calculate percentile
    let percentile = 100;
    if (myRank > 0 && sortedStudents.length > 0) {
      percentile = Math.round((myRank / sortedStudents.length) * 100);
      if (percentile === 0) percentile = 1;
    }

    // Format hours for display
    const myHoursInt = Math.floor(myHours);
    const myMins = Math.round((myHours - myHoursInt) * 60);
    const hoursLearnedText =
      myHoursInt > 0 ? `${myHoursInt}h ${myMins}m` : `${myMins}m`;

    const remainingHours = Math.max(0, weeklyGoalHours - myHours);
    const remainingHoursInt = Math.floor(remainingHours);
    const remainingMins = Math.round((remainingHours - remainingHoursInt) * 60);
    const remainingText =
      remainingHoursInt > 0
        ? `${remainingHoursInt}h ${remainingMins}m`
        : `${remainingMins}m`;

    res.status(200).json({
      success: true,
      message: "Weekly goal fetched successfully",
      data: {
        hoursLearnedThisWeek: parseFloat(myHours.toFixed(2)),
        hoursLearnedText: hoursLearnedText,
        weeklyGoalHours: weeklyGoalHours,
        lessonsCompletedThisWeek: myData
          ? allProgresses
              .filter((p) => p.student.toString() === myStudentId)
              .reduce((count, p) => {
                return (
                  count +
                  p.completedLessons.filter(
                    (cl: any) =>
                      cl.completedAt &&
                      new Date(cl.completedAt) >= sevenDaysAgo,
                  ).length
                );
              }, 0)
          : 0,
        percentile: percentile,
        percentileText: `You are in the top ${percentile}% of learners this week!`,
        progressText:
          myHours >= weeklyGoalHours
            ? "Awesome! You hit your weekly goal."
            : `Keep it up — ${remainingText} more to hit your weekly goal.`,
      },
    });
  } catch (error) {
    next(error);
  }
};
