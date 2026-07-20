import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../../../course/models/courseModel.js";
import { CourseViewModel } from "../../../course/models/courseViewModel.js";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../../../review/models/reviewModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const getInstructorCoursePerformance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const { search, courseId, page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const matchStage: any = { instructor: instructorObjectId };
    if (courseId) {
      matchStage._id = new mongoose.Types.ObjectId(courseId as string);
    }

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: matchStage,
      },
    ];

    if (search) {
      pipeline.push({
        $match: { title: { $regex: search as string, $options: "i" } },
      });
    }

    pipeline.push(
      // Join Enrollments to get students count and revenue
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      // Join Progress to calculate completion rate
      {
        $lookup: {
          from: "progresses",
          localField: "_id",
          foreignField: "course",
          as: "progresses",
        },
      },
      // Process Data
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          price: 1,
          totalViews: 1,
          rating: 1,
          studentsCount: {
            $size: {
              $filter: {
                input: "$enrollments",
                as: "e",
                cond: { $eq: ["$$e.paymentStatus", "completed"] },
              },
            },
          },
          revenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$enrollments",
                    as: "e",
                    cond: { $eq: ["$$e.paymentStatus", "completed"] },
                  },
                },
                as: "e",
                in: "$$e.pricePaid",
              },
            },
          },
          completedStudentsCount: {
            $size: {
              $filter: {
                input: "$progresses",
                as: "p",
                cond: { $eq: ["$$p.isCourseCompleted", true] },
              },
            },
          },
        },
      },
      // Add completionRate
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ["$studentsCount", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$completedStudentsCount", "$studentsCount"],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      // Remove unnecessary fields
      {
        $project: {
          completedStudentsCount: 0,
        },
      },
      { $sort: { revenue: -1, studentsCount: -1 } },
    );

    const facetPipeline: mongoose.PipelineStage[] = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limitNum }],
        },
      },
    ];

    const result = await CourseModel.aggregate(facetPipeline);
    const total = result[0].metadata[0]?.total || 0;
    const courses = result[0].data;

    sendResponse(res, 200, true, "Course performance fetched successfully", {
      courses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};
