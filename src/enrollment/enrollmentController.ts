import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../course/models/courseModel.js";
import { EnrollmentModel } from "./enrollmentModel.js";
import { ProgressModel } from "../progress/models/progressModel.js";
import mongoose from "mongoose";

// ─── 1. Enroll In Course
export const enrollInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { courseId } = req.body;
    const studentId = (req as any).user?._id || (req as any).user?.id;

    if (!studentId) {
      return next(createHttpError(401, "Student authentication failed"));
    }

    // check course Published
    const course = await CourseModel.findById(courseId);
    if (!course || course.status !== "published") {
      return next(
        createHttpError(404, "Course not found or not published yet"),
      );
    }

    // Check Already Enrolled Or not
    const alreadyEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyEnrolled) {
      return next(
        createHttpError(400, "You have already enrolled in this course"),
      );
    }

    // enrollment
    const enrollment = await EnrollmentModel.create({
      student: studentId,
      course: courseId,
      pricePaid: course.price,
      paymentStatus: "completed",
    });

    await CourseModel.findByIdAndUpdate(courseId, {
      $inc: { enrolledCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in the course",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrolledCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = (req as any).user?._id || (req as any).user?.id;
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const { search, stats, page = "1", limit = "10" } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { student: studentObjectId } },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $lookup: {
          from: "users",
          localField: "course.instructor",
          foreignField: "_id",
          as: "course.instructor",
        },
      },
      {
        $unwind: {
          path: "$course.instructor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "progresses",
          let: { studentId: "$student", courseId: "$course._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$student", "$$studentId"] },
                    { $eq: ["$course", "$$courseId"] },
                  ],
                },
              },
            },
          ],
          as: "progressData",
        },
      },
      {
        $unwind: {
          path: "$progressData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          "course.title": { $regex: search as string, $options: "i" },
        },
      });
    }

    if (stats === "completed") {
      pipeline.push({
        $match: {
          "progressData.isCourseCompleted": true,
        },
      });
    } else if (stats === "in-progress") {
      pipeline.push({
        $match: {
          "progressData.isCourseCompleted": { $ne: true },
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNumber });

    const [enrollments, countResult] = await Promise.all([
      EnrollmentModel.aggregate(pipeline),
      EnrollmentModel.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    const formattedCourses = enrollments.map((e: any) => {
      const course = e.course;
      const progress = e.progressData;

      const totalLessons = course.lessonsCount || 0;
      const completedLessonsCount =
        progress && progress.completedLessons
          ? progress.completedLessons.length
          : 0;
      const percentage =
        totalLessons > 0
          ? Math.round((completedLessonsCount / totalLessons) * 100)
          : 0;
      const isCourseCompleted = progress ? progress.isCourseCompleted : false;

      return {
        enrollmentId: e._id,
        enrolledAt: e.createdAt,
        course: {
          _id: course._id,
          title: course.title,
          thumbnail: course.thumbnail,
          category: course.category,
          lessonsCount: totalLessons,
          totalDuration: course.totalDuration,
          rating: course.rating,
          instructor: course.instructor
            ? {
                _id: course.instructor._id,
                fullName: course.instructor.fullName,
                avatar: course.instructor.avatar,
              }
            : null,
        },
        progress: {
          completedLessonsCount,
          percentage,
          isCourseCompleted,
          status: isCourseCompleted ? "Completed" : "In Progress",
          lastActivityAt: progress?.updatedAt || e.createdAt,
        },
      };
    });

    res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      data: {
        courses: formattedCourses,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Get Student Stats
export const getMyStats = async (
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

    // Fetch Progresses
    const progresses = await ProgressModel.find({ student: studentId });

    let completed = 0;
    progresses.forEach((p) => {
      if (p.isCourseCompleted) {
        completed++;
      }
    });

    const inProgress = totalEnrolled - completed;
    const certificates = completed;

    res.status(200).json({
      success: true,
      message: "Student stats fetched successfully",
      data: {
        totalEnrolled,
        inProgress,
        completed,
        certificates,
      },
    });
  } catch (error) {
    next(error);
  }
};
