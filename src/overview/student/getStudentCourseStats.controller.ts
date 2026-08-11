import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../progress/models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentCourseStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // Total Enrolled
    const totalEnrolled = await EnrollmentModel.countDocuments({
      student: studentId,
    });

    // Enrolled This Month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const enrolledThisMonth = await EnrollmentModel.countDocuments({
      student: studentId,
      createdAt: { $gte: startOfMonth },
    });

    // Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });

    let completed = 0;
    const courseIds = progresses.map((p) => p.course);

    // Fetch related courses to calculate hours learned
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    courses.forEach((c) => courseMap.set(c._id.toString(), c));

    let totalSecondsLearned = 0;
    let thisWeekSecondsLearned = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    progresses.forEach((p) => {
      if (p.isCourseCompleted) {
        completed++;
      }

      const course = courseMap.get(p.course.toString());
      if (course && p.completedLessons && p.completedLessons.length > 0) {
        course.sections.forEach((section: any) => {
          if (section.lessons) {
            section.lessons.forEach((lesson: any) => {
              // Find if this lesson is completed
              const completedItem = p.completedLessons.find((l: any) => 
                (l.lessonId ? l.lessonId.toString() : l.toString()) === lesson._id.toString()
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
                
                // Check if completed this week
                if (completedItem.completedAt && new Date(completedItem.completedAt) >= sevenDaysAgo) {
                  thisWeekSecondsLearned += seconds;
                }
              }
            });
          }
        });
      }
    });

    const completionRate =
      totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0;
    const certificates = completed;

    const hrs = Math.floor(totalSecondsLearned / 3600);
    const mins = Math.floor((totalSecondsLearned % 3600) / 60);
    const totalHoursString = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const thisWeekHrs = Math.floor(thisWeekSecondsLearned / 3600);
    const thisWeekMins = Math.floor((thisWeekSecondsLearned % 3600) / 60);
    const thisWeekHoursString = thisWeekHrs > 0 ? `${thisWeekHrs}h ${thisWeekMins}m` : `${thisWeekMins}m`;

    const inProgress = totalEnrolled - completed;

    res.status(200).json({
      success: true,
      message: "Student stats fetched successfully",
      data: {
        enrolledCourses: {
          total: totalEnrolled,
          thisMonth: enrolledThisMonth,
        },
        completed: {
          total: completed,
          completionRate: completionRate,
        },
        certificates: {
          total: certificates,
          text: "Download anytime",
        },
        hoursLearned: {
          total: totalHoursString,
          thisWeek: thisWeekHoursString,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
