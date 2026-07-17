import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import CourseModel from "../models/courseModel.js";
import { CourseViewModel } from "../models/courseViewModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ReviewModel } from "../../review/models/reviewModel.js";

// ─── Helper Response Function
const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

// ─── 1. Get Instructor Analytics Stats (Cards)
export const getInstructorAnalyticsStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id totalViews");
    const courseIds = instructorCourses.map((c) => c._id);

    // 1. Views
    const totalViews = instructorCourses.reduce(
      (acc, c) => acc + (c.totalViews || 0),
      0,
    );
    const viewsThisMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfCurrentMonth },
    });

    // 2. Revenue and Students
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
    }).select("pricePaid createdAt");

    let totalRevenue = 0;
    let revenueThisMonth = 0;
    let totalStudents = enrollments.length;
    let studentsThisMonth = 0;

    enrollments.forEach((enrollment) => {
      totalRevenue += enrollment.pricePaid || 0;
      if (enrollment.createdAt >= startOfCurrentMonth) {
        revenueThisMonth += enrollment.pricePaid || 0;
        studentsThisMonth += 1;
      }
    });

    // 3. Ratings
    const reviewsAgg = await ReviewModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const avgRating =
      reviewsAgg.length > 0
        ? parseFloat(reviewsAgg[0].avgRating.toFixed(1))
        : 0;
    const totalReviews = reviewsAgg.length > 0 ? reviewsAgg[0].totalReviews : 0;

    sendResponse(
      res,
      200,
      true,
      "Instructor analytics stats fetched successfully",
      {
        revenue: {
          total: totalRevenue,
          thisMonth: revenueThisMonth,
        },
        students: {
          total: totalStudents,
          thisMonth: studentsThisMonth,
        },
        views: {
          total: totalViews,
          thisMonth: viewsThisMonth,
        },
        rating: {
          average: avgRating,
          totalReviews: totalReviews,
        },
      },
    );
  } catch (error) {
    next(error);
  }
};

// ─── 1.5 Get Instructor Analytics Growth Rates
export const getInstructorAnalyticsGrowth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const now = new Date();

    // Start of Current Month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start and End of Previous Month
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const instructorCourses = await CourseModel.find({
      instructor: instructorObjectId,
    }).select("_id");
    const courseIds = instructorCourses.map((c) => c._id);

    // 1. Views
    const viewsThisMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfCurrentMonth },
    });
    const viewsPreviousMonth = await CourseViewModel.countDocuments({
      course: { $in: courseIds },
      createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
    });

    // 2. Revenue and Students
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
      createdAt: { $gte: startOfPreviousMonth }, // Only need last 2 months
    }).select("pricePaid createdAt");

    let revenueThisMonth = 0;
    let revenuePreviousMonth = 0;
    let studentsThisMonth = 0;
    let studentsPreviousMonth = 0;

    enrollments.forEach((enrollment) => {
      if (enrollment.createdAt >= startOfCurrentMonth) {
        revenueThisMonth += enrollment.pricePaid || 0;
        studentsThisMonth += 1;
      } else if (
        enrollment.createdAt >= startOfPreviousMonth &&
        enrollment.createdAt <= endOfPreviousMonth
      ) {
        revenuePreviousMonth += enrollment.pricePaid || 0;
        studentsPreviousMonth += 1;
      }
    });

    // 3. Ratings
    const reviewsThisMonthAgg = await ReviewModel.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          createdAt: { $gte: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRatingThisMonth =
      reviewsThisMonthAgg.length > 0 ? reviewsThisMonthAgg[0].avgRating : 0;

    const reviewsPrevMonthAgg = await ReviewModel.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
        },
      },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRatingPrevMonth =
      reviewsPrevMonthAgg.length > 0 ? reviewsPrevMonthAgg[0].avgRating : 0;

    // Helpers
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    const calculateChange = (current: number, previous: number) => {
      return parseFloat((current - previous).toFixed(1));
    };

    // Calculate rating change, handle first month scenario
    let ratingChange = calculateChange(avgRatingThisMonth, avgRatingPrevMonth);
    if (
      ratingChange === 0 &&
      avgRatingThisMonth > 0 &&
      avgRatingPrevMonth === 0
    ) {
      ratingChange = avgRatingThisMonth;
    }

    sendResponse(
      res,
      200,
      true,
      "Instructor analytics growth fetched successfully",
      {
        revenueGrowth: calculateGrowth(revenueThisMonth, revenuePreviousMonth),
        studentGrowth: calculateGrowth(
          studentsThisMonth,
          studentsPreviousMonth,
        ),
        viewGrowth: calculateGrowth(viewsThisMonth, viewsPreviousMonth),
        ratingChange: ratingChange,
      },
    );
  } catch (error) {
    next(error);
  }
};


// ─── 1.75 Get Instructor Revenue Overview (Last 6 Months Chart)
export const getInstructorRevenueOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    // Get instructor's course IDs
    const instructorCourses = await CourseModel.find({ instructor: instructorObjectId }).select("_id");
    const courseIds = instructorCourses.map((c) => c._id);

    // Calculate dates for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 5 months ago + current month = 6 months
    
    // Fetch enrollments for the last 6 months
    const enrollments = await EnrollmentModel.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
      createdAt: { $gte: sixMonthsAgo }
    }).select("pricePaid createdAt");

    let totalRevenue = 0;
    let totalStudents = enrollments.length;

    // Initialize array for 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartDataMap = new Map<string, { month: string; revenue: number; students: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      chartDataMap.set(key, {
        month: monthNames[d.getMonth()],
        revenue: 0,
        students: 0,
      });
    }

    enrollments.forEach((enrollment) => {
      totalRevenue += enrollment.pricePaid || 0;
      
      const date = new Date(enrollment.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (chartDataMap.has(key)) {
        const monthData = chartDataMap.get(key)!;
        monthData.revenue += enrollment.pricePaid || 0;
        monthData.students += 1;
      }
    });

    const chartData = Array.from(chartDataMap.values());

    sendResponse(res, 200, true, "Instructor revenue overview fetched successfully", {
      totalRevenue,
      totalStudents,
      chartData
    });

  } catch (error) {
    next(error);
  }
};

// ─── 2. Get Instructor Course Performance (Table)
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
