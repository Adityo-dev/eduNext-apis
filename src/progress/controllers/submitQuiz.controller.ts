import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../models/progressModel.js";
import mongoose from "mongoose";

export const submitQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    const quizId = req.params.quizId as string;
    const { answers } = req.body;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!studentId) {
      return next(createHttpError(401, "Student authentication failed"));
    }

    if (!answers || !Array.isArray(answers)) {
      return next(createHttpError(400, "Answers array is required"));
    }

    // Check if enrolled
    const isEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
      paymentStatus: "completed",
    });

    if (!isEnrolled) {
      return next(createHttpError(403, "You are not enrolled in this course"));
    }

    // Find course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    // Find the lesson and quiz
    let targetLesson: any = null;
    let targetQuiz: any = null;

    for (const section of course.sections) {
      const lesson = section.lessons.find((l: any) => l._id.toString() === lessonId);
      if (lesson) {
        targetLesson = lesson;
        targetQuiz = lesson.quizzes?.find((q: any) => q._id.toString() === quizId);
        if (targetQuiz) break;
      }
    }

    if (!targetLesson || !targetQuiz) {
      return next(createHttpError(404, "Lesson or Quiz not found"));
    }

    const totalQuestions = targetQuiz.questions.length;
    if (totalQuestions === 0) {
      return next(createHttpError(400, "Quiz has no questions"));
    }

    let correctAnswersCount = 0;
    const reviewData: any[] = [];

    // Evaluate answers
    for (const question of targetQuiz.questions) {
      const submittedAnswer = answers.find(
        (ans: any) => ans.questionId === question._id.toString()
      );

      const correctOption = question.options.find((opt: any) => opt.isCorrect);

      let isStudentCorrect = false;
      if (submittedAnswer && correctOption && submittedAnswer.optionId === correctOption._id.toString()) {
        isStudentCorrect = true;
        correctAnswersCount++;
      }

      reviewData.push({
        questionId: question._id,
        questionText: question.questionText,
        submittedOptionId: submittedAnswer ? submittedAnswer.optionId : null,
        correctOptionId: correctOption ? correctOption._id : null,
        isCorrect: isStudentCorrect,
        reason: question.reason,
      });
    }

    const score = Math.round((correctAnswersCount / totalQuestions) * 100);
    const isPassed = score >= targetQuiz.passMark;

    // Save to Progress Model
    let progress = await ProgressModel.findOne({
      student: studentId,
      course: courseId,
    });

    if (!progress) {
      progress = await ProgressModel.create({
        student: studentId,
        course: courseId,
        completedLessons: [],
        quizScores: [{ quizId: new mongoose.Types.ObjectId(quizId as string), score, isPassed }],
      });
    } else {
      const existingQuizIndex = progress.quizScores?.findIndex(
        (q) => q.quizId.toString() === quizId
      );

      if (progress.quizScores === undefined) {
          progress.quizScores = [];
      }
      
      const scores = progress.quizScores as any[];

      if (existingQuizIndex !== undefined && existingQuizIndex >= 0) {
        // Update if the new score is higher
        if (score > scores[existingQuizIndex].score) {
          scores[existingQuizIndex].score = score;
          scores[existingQuizIndex].isPassed = isPassed;
        }
      } else {
        scores.push({
          quizId: new mongoose.Types.ObjectId(quizId),
          score,
          isPassed,
        });
      }
      progress.quizScores = scores;
      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        score,
        passMark: targetQuiz.passMark,
        isPassed,
        correctAnswersCount,
        totalQuestions,
        review: reviewData,
      },
    });
  } catch (error) {
    next(error);
  }
};
