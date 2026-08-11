import type { NextFunction, Request, Response } from "express";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../models/progressModel.js";
import CourseModel from "../../course/models/courseModel.js";

export const getStudentOverallProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;

    // 1. Fetch all enrollments for this student
    const enrollments = await EnrollmentModel.find({ student: studentId });
    const totalCourses = enrollments.length;

    // 2. Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });
    const courseIds = progresses.map((p) => p.course);

    // 3. Fetch related courses to calculate totals
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map();
    courses.forEach((c) => courseMap.set(c._id.toString(), c));

    let completedCourses = 0;
    let completedLessonsCount = 0;
    let totalLessonsCount = 0;
    let passedQuizzesCount = 0;
    let totalQuizzesCount = 0;

    progresses.forEach((p) => {
      // Courses Done
      if (p.isCourseCompleted) {
        completedCourses++;
      }

      // Lessons Done
      completedLessonsCount += p.completedLessons?.length || 0;

      // Quizzes Passed
      if (p.quizScores && p.quizScores.length > 0) {
        passedQuizzesCount += p.quizScores.filter((q) => q.isPassed).length;
      }

      // Calculate totals from the course
      const course = courseMap.get(p.course.toString());
      if (course) {
        totalLessonsCount += course.lessonsCount || 0;

        let courseQuizzes = 0;
        course.sections?.forEach((section: any) => {
          section.lessons?.forEach((lesson: any) => {
            if (lesson.quizzes) {
              courseQuizzes += lesson.quizzes.length;
            }
          });
        });
        totalQuizzesCount += courseQuizzes;
      }
    });

    // Calculate rates
    const coursesRate = totalCourses > 0 ? completedCourses / totalCourses : 0;
    const lessonsRate =
      totalLessonsCount > 0 ? completedLessonsCount / totalLessonsCount : 0;
    const quizzesRate =
      totalQuizzesCount > 0 ? passedQuizzesCount / totalQuizzesCount : 0;

    const overallPercentage =
      Math.round(((coursesRate + lessonsRate + quizzesRate) / 3) * 100) || 0;

    res.status(200).json({
      success: true,
      message: "Student overall progress fetched successfully",
      data: {
        overallPercentage,
        lessonsDone: {
          completed: completedLessonsCount,
          total: totalLessonsCount,
        },
        quizzesPassed: {
          completed: passedQuizzesCount,
          total: totalQuizzesCount,
        },
        coursesDone: {
          completed: completedCourses,
          total: totalCourses,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
