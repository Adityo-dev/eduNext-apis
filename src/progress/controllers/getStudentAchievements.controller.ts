import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentAchievements = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // Fetch Enrollments
    const enrollments = await EnrollmentModel.find({ student: studentId });
    const totalEnrolled = enrollments.length;

    // Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });
    const courseIds = progresses.map((p) => p.course);

    // Fetch Courses for duration calculation
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    courses.forEach((c) => courseMap.set(c._id.toString(), c));

    // Achievement Trackers
    let hasCompletedCourse = false;
    let totalQuizScores = 0;
    let totalQuizzesTaken = 0;
    let totalSecondsLearned = 0;

    // Collect all unique dates of lesson completion (normalized to YYYY-MM-DD)
    const completionDatesCount: Record<string, number> = {};

    progresses.forEach((p) => {
      if (p.isCourseCompleted) {
        hasCompletedCourse = true;
      }

      if (p.quizScores && p.quizScores.length > 0) {
        p.quizScores.forEach((q) => {
          totalQuizScores += q.score;
          totalQuizzesTaken++;
        });
      }

      const course = courseMap.get(p.course.toString());
      if (course && p.completedLessons && p.completedLessons.length > 0) {
        p.completedLessons.forEach((completedItem: any) => {
          // Track Completion Dates for Streaks & Fast Learner
          if (completedItem.completedAt) {
            const dateStr = new Date(completedItem.completedAt)
              .toISOString()
              .split("T")[0] as string;
            completionDatesCount[dateStr] =
              (completionDatesCount[dateStr] || 0) + 1;
          }

          // Track Time for Pro Learner
          course.sections?.forEach((section: any) => {
            section.lessons?.forEach((lesson: any) => {
              const completedLessonId = completedItem.lessonId
                ? completedItem.lessonId.toString()
                : completedItem.toString();
              if (
                completedLessonId === lesson._id.toString() &&
                lesson.duration
              ) {
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
              }
            });
          });
        });
      }
    });

    // 1. 7-Day Streak
    let has7DayStreak = false;
    const sortedDates = Object.keys(completionDatesCount).sort();

    if (sortedDates.length >= 7) {
      // Check for any 7 consecutive days in the past
      let tempStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1] as string);
        const currDate = new Date(sortedDates[i] as string);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak >= 7) {
            has7DayStreak = true;
          }
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }

    // 2. First Cert (Completed at least 1 course)
    const isFirstCertUnlocked = hasCompletedCourse;

    // 3. Fast Learner (Completed 5+ lessons in a single day)
    const isFastLearnerUnlocked = Object.values(completionDatesCount).some(
      (count) => count >= 5,
    );

    // 4. Top Scorer (Average quiz score >= 90%)
    const quizAverage =
      totalQuizzesTaken > 0 ? totalQuizScores / totalQuizzesTaken : 0;
    const isTopScorerUnlocked = quizAverage >= 90;

    // 5. 5 Courses (Enrolled in 5 or more courses)
    const is5CoursesUnlocked = totalEnrolled >= 5;

    // 6. Pro Learner (Learned for 50+ hours)
    const totalHoursLearned = totalSecondsLearned / 3600;
    const isProLearnerUnlocked = totalHoursLearned >= 50;

    // Construct response
    const achievements = [
      {
        id: "streak_7",
        title: "7-Day Streak",
        description:
          "Complete at least one lesson per day for 7 consecutive days.",
        isUnlocked: has7DayStreak,
        icon: "🔥",
      },
      {
        id: "first_cert",
        title: "First Cert",
        description: "Complete your first course and earn a certificate.",
        isUnlocked: isFirstCertUnlocked,
        icon: "🎓",
      },
      {
        id: "fast_learner",
        title: "Fast Learner",
        description: "Complete 5 or more lessons in a single day.",
        isUnlocked: isFastLearnerUnlocked,
        icon: "⚡",
      },
      {
        id: "top_scorer",
        title: "Top Scorer",
        description: "Achieve an overall average quiz score of 90% or higher.",
        isUnlocked: isTopScorerUnlocked,
        icon: "🏆",
      },
      {
        id: "five_courses",
        title: "5 Courses",
        description: "Enroll in at least 5 different courses.",
        isUnlocked: is5CoursesUnlocked,
        icon: "📚",
      },
      {
        id: "pro_learner",
        title: "Pro Learner",
        description: "Accumulate 50 or more hours of total learning time.",
        isUnlocked: isProLearnerUnlocked,
        icon: "💎",
      },
    ];

    res.status(200).json({
      success: true,
      message: "Student achievements fetched successfully",
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
};
