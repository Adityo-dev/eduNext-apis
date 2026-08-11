import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentSummaryCards = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // 1. Fetch Enrollments
    const enrollments = await EnrollmentModel.find({ student: studentId });
    const totalEnrolled = enrollments.length;

    // 2. Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });
    const courseIds = progresses.map((p) => p.course);

    // 3. Fetch Courses
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    courses.forEach((c) => courseMap.set(c._id.toString(), c));

    let completedLessonsCount = 0;
    let totalLessonsCount = 0;

    let totalSecondsLearned = 0;
    let thisWeekSecondsLearned = 0;

    let totalQuizScores = 0;
    let totalQuizzesTaken = 0;

    let completedCoursesCount = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    progresses.forEach((p) => {
      // Completed Courses (Certificates)
      if (p.isCourseCompleted) {
        completedCoursesCount++;
      }

      // Quiz Scores
      if (p.quizScores && p.quizScores.length > 0) {
        p.quizScores.forEach((q) => {
          totalQuizScores += q.score;
          totalQuizzesTaken++;
        });
      }

      const course = courseMap.get(p.course.toString());
      if (course) {
        totalLessonsCount += course.lessonsCount || 0;

        if (p.completedLessons && p.completedLessons.length > 0) {
          completedLessonsCount += p.completedLessons.length;

          course.sections?.forEach((section: any) => {
            section.lessons?.forEach((lesson: any) => {
              const completedItem = p.completedLessons.find(
                (l: any) =>
                  (l.lessonId ? l.lessonId.toString() : l.toString()) ===
                  lesson._id.toString(),
              );

              if (completedItem && lesson.duration) {
                let seconds = 0;
                const parts = lesson.duration.split(":").map(Number);
                if (parts.length === 2) {
                  seconds = parts[0] * 60 + parts[1];
                } else if (parts.length === 3) {
                  seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                  seconds = parts[0] * 60;
                }

                totalSecondsLearned += seconds;

                if (
                  completedItem.completedAt &&
                  new Date(completedItem.completedAt) >= sevenDaysAgo
                ) {
                  thisWeekSecondsLearned += seconds;
                }
              }
            });
          });
        }
      }
    });

    // Formatting output
    const quizAverage =
      totalQuizzesTaken > 0
        ? Math.round(totalQuizScores / totalQuizzesTaken)
        : 0;

    const hrs = Math.floor(totalSecondsLearned / 3600);
    const mins = Math.floor((totalSecondsLearned % 3600) / 60);
    const totalHoursString = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const thisWeekHrs = Math.floor(thisWeekSecondsLearned / 3600);
    const thisWeekMins = Math.floor((thisWeekSecondsLearned % 3600) / 60);
    const thisWeekHoursString =
      thisWeekHrs > 0
        ? `${thisWeekHrs}h ${thisWeekMins}m this week`
        : `${thisWeekMins}m this week`;

    const inProgressCourses = totalEnrolled - completedCoursesCount;

    res.status(200).json({
      success: true,
      message: "Student summary cards fetched successfully",
      data: {
        lessonsCompleted: {
          value: completedLessonsCount,
          subtitle: `out of ${totalLessonsCount} total`,
        },
        hoursLearned: {
          value: totalHoursString,
          subtitle: thisWeekHoursString,
        },
        quizAverage: {
          value: `${quizAverage}%`,
          subtitle: "Based on overall scores",
        },
        certificates: {
          value: completedCoursesCount,
          subtitle: `${inProgressCourses} more in progress`,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
