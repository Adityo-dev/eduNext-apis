import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../course/models/courseModel.js";
import { ProgressModel } from "../models/progressModel.js";

export const getQuizHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;
    const { courseId } = req.query;

    const query: any = { student: studentId };
    if (courseId) {
      query.course = new mongoose.Types.ObjectId(courseId as string);
    }

    const progresses = await ProgressModel.find(query).populate({
      path: "course",
      select: "title category sections",
    });

    if (!courseId) {
      // ─── Mode 1: Grouped Summary (All Courses) ───
      const courseSummaries: any[] = [];

      progresses.forEach((progress) => {
        const course = progress.course as any;
        if (!course) return;

        const quizScores = progress.quizScores || [];
        if (quizScores.length === 0) return; // Skip if no quizzes taken

        const totalScore = quizScores.reduce(
          (acc, curr) => acc + curr.score,
          0,
        );
        const averageScore = Math.round(totalScore / quizScores.length);
        const isPassed = averageScore >= 60; // Assuming 60% is the passing mark

        let lastTakenAt = progress.updatedAt;
        if (quizScores.length > 0) {
          const takenDates = quizScores.map((qs) =>
            new Date((qs as any).takenAt || progress.updatedAt).getTime(),
          );
          lastTakenAt = new Date(Math.max(...takenDates));
        }

        courseSummaries.push({
          courseId: course._id,
          courseTitle: course.title,
          category: course.category || "General",
          averageScore,
          isPassed,
          totalQuizzesTaken: quizScores.length,
          lastTakenAt,
        });
      });

      courseSummaries.sort(
        (a, b) => b.lastTakenAt.getTime() - a.lastTakenAt.getTime(),
      );

      res.status(200).json({
        success: true,
        message: "Course quiz summaries fetched successfully",
        data: courseSummaries,
      });
      return;
    }

    // ─── Mode 2: Detailed Quiz History (Specific Course) ───
    const quizHistory: any[] = [];

    progresses.forEach((progress) => {
      const course = progress.course as any;
      if (!course) return;

      // Build a map of quizId -> quiz title from the course schema
      const quizMap = new Map<string, string>();
      course.sections?.forEach((section: any) => {
        section.lessons?.forEach((lesson: any) => {
          lesson.quizzes?.forEach((quiz: any) => {
            quizMap.set(quiz._id.toString(), quiz.title);
          });
        });
      });

      progress.quizScores?.forEach((qs) => {
        quizHistory.push({
          quizId: qs.quizId,
          quizTitle: quizMap.get(qs.quizId.toString()) || "Unknown Quiz",
          courseId: course._id,
          courseTitle: course.title,
          score: qs.score,
          isPassed: qs.isPassed,
          takenAt: (qs as any).takenAt || progress.updatedAt,
        });
      });
    });

    // Sort by takenAt descending
    quizHistory.sort((a, b) => {
      const dateA = new Date(a.takenAt).getTime();
      const dateB = new Date(b.takenAt).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return b.score - a.score;
    });

    res.status(200).json({
      success: true,
      message: "Detailed quiz history fetched successfully",
      data: quizHistory,
    });
  } catch (error) {
    next(error);
  }
};
