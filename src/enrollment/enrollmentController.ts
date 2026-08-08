import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../course/models/courseModel.js";
import { ProgressModel } from "../progress/models/progressModel.js";
import { EnrollmentModel } from "./enrollmentModel.js";

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
          subCategory: course.subCategory,
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

    progresses.forEach((p) => {
      if (p.isCourseCompleted) {
        completed++;
      }

      const course = courseMap.get(p.course.toString());
      if (course && p.completedLessons && p.completedLessons.length > 0) {
        const completedLessonIds = p.completedLessons.map((id) =>
          id.toString(),
        );
        course.sections.forEach((section: any) => {
          if (section.lessons) {
            section.lessons.forEach((lesson: any) => {
              if (
                completedLessonIds.includes(lesson._id.toString()) &&
                lesson.duration
              ) {
                const parts = lesson.duration.split(":").map(Number);
                if (parts.length === 2) {
                  totalSecondsLearned += parts[0] * 60 + parts[1];
                } else if (parts.length === 3) {
                  totalSecondsLearned +=
                    parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                  totalSecondsLearned += parts[0] * 60;
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
          thisWeek: "0h", // Lesson completion dates are not tracked individually
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.5. Get Student Basic Stats (Legacy)
export const getMyBasicStats = async (
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
      message: "Student basic stats fetched successfully",
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

// ─── 4. Get Instructor's Enrolled Students Stats
export const getInstructorStudentStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseObj",
        },
      },
      { $unwind: "$courseObj" },
      {
        $match: {
          "courseObj.instructor": instructorObjectId,
        },
      },
      {
        $lookup: {
          from: "progresses",
          let: { studentId: "$student", courseId: "$course" },
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
      {
        $lookup: {
          from: "reviews",
          let: { studentId: "$student", courseId: "$course" },
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
          as: "reviewData",
        },
      },
      {
        $unwind: {
          path: "$reviewData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          activeThisWeek: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$progressData.updatedAt",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: {
              $cond: ["$progressData.isCourseCompleted", 1, 0],
            },
          },
          withReviews: {
            $sum: {
              $cond: [{ $ifNull: ["$reviewData._id", false] }, 1, 0],
            },
          },
        },
      },
    ];

    const result = await EnrollmentModel.aggregate(pipeline);
    const stats = result[0] || {
      totalStudents: 0,
      activeThisWeek: 0,
      completed: 0,
      withReviews: 0,
    };
    if (stats._id === null) delete stats._id;

    res.status(200).json({
      success: true,
      message: "Instructor student stats fetched successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 5. Get Instructor's Enrolled Students (List)
export const getInstructorStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const { courseId, search, page = "1", limit = "10" } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseObj",
        },
      },
      { $unwind: "$courseObj" },
      {
        $match: {
          "courseObj.instructor": instructorObjectId,
        },
      },
    ];

    if (courseId) {
      pipeline.push({
        $match: {
          "courseObj._id": new mongoose.Types.ObjectId(courseId as string),
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentObj",
        },
      },
      { $unwind: "$studentObj" },
    );

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "studentObj.name": { $regex: search as string, $options: "i" } },
            { "studentObj.email": { $regex: search as string, $options: "i" } },
            {
              "studentObj.firstName": {
                $regex: search as string,
                $options: "i",
              },
            },
            {
              "studentObj.lastName": {
                $regex: search as string,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "progresses",
          let: { studentId: "$student", courseId: "$course" },
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
      {
        $lookup: {
          from: "reviews",
          let: { studentId: "$student", courseId: "$course" },
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
          as: "reviewData",
        },
      },
      {
        $unwind: {
          path: "$reviewData",
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    pipeline.push({ $sort: { createdAt: -1 } });

    const facetPipeline: mongoose.PipelineStage[] = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limitNumber }],
        },
      },
    ];

    const result = await EnrollmentModel.aggregate(facetPipeline);

    const total = result[0].metadata[0]?.total || 0;
    const rawData = result[0].data;

    const formattedStudents = rawData.map((item: any) => {
      const student = item.studentObj;
      const course = item.courseObj;
      const progress = item.progressData;
      const review = item.reviewData;

      const totalLessons = course.lessonsCount || 0;
      const completedLessonsCount =
        progress && progress.completedLessons
          ? progress.completedLessons.length
          : 0;
      const percentage =
        totalLessons > 0
          ? Math.round((completedLessonsCount / totalLessons) * 100)
          : 0;

      const studentName =
        student.name ||
        `${student.firstName || ""} ${student.lastName || ""}`.trim();

      return {
        _id: item._id,
        student: {
          _id: student._id,
          name: studentName || "Unknown Student",
          email: student.email,
          avatar: student.avatar,
        },
        course: {
          _id: course._id,
          title: course.title,
        },
        progress: percentage,
        rating: review ? review.rating : 0,
        lastActive: progress?.updatedAt || item.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Instructor students fetched successfully",
      data: {
        students: formattedStudents,
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
