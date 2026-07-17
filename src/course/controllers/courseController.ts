import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../progress/models/progressModel.js";
import CourseModel from "../models/courseModel.js";
import { CourseViewModel } from "../models/courseViewModel.js";

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

// ─── 1. Get Courses Management Stats (Admin Only)
export const getCoursesManagementStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [totalCourses, published, pending, rejected] = await Promise.all([
      CourseModel.countDocuments(),
      CourseModel.countDocuments({ status: "published" }),
      CourseModel.countDocuments({ status: "pending" }),
      CourseModel.countDocuments({ status: "rejected" }),
    ]);

    res.status(200).json({
      success: true,
      message: "User management stats fetched successfully",
      data: {
        totalCourses,
        published,
        pending,
        rejected,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Create Course
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    if (!instructorId) {
      return next(createHttpError(401, "Instructor authentication failed"));
    }

    const {
      title,
      subtitle,
      description,
      price,
      estimatedPrice,
      thumbnail,
      category,
      level,
      language,
      tags,
      hasCertificate,
      requirements,
      whatYouLearn,
      sections,
    } = req.body;

    // Validation
    if (
      !title ||
      !subtitle ||
      !description ||
      !price ||
      !category ||
      !thumbnail
    ) {
      return next(
        createHttpError(
          400,
          "Please provide all required fields (title, subtitle, description, price, category, thumbnail)",
        ),
      );
    }

    const lessonsCount = Array.isArray(sections)
      ? sections.reduce(
          (total: number, section: any) =>
            total + (section.lessons?.length || 0),
          0,
        )
      : 0;

    const course = await CourseModel.create({
      title,
      subtitle,
      description,
      price,
      estimatedPrice,
      thumbnail,
      category,
      level,
      language,
      tags,
      hasCertificate,
      requirements,
      whatYouLearn,
      sections: sections || [],
      lessonsCount,
      instructor: instructorId,
      status: "draft",
    });

    sendResponse(
      res,
      201,
      true,
      "Course created successfully as a draft",
      course,
    );
  } catch (error) {
    next(error);
  }
};

// ─── 3. Get All Courses (Public)
export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      search,
      category,
      level,
      language,
      minPrice,
      maxPrice,
      rating,
      certificate,
      sort = "Most Popular",
      page = "1",
      limit = "12",
    } = req.query;

    const filter: Record<string, unknown> = { status: "published" };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (language) filter.language = language;
    if (certificate === "true") filter.hasCertificate = true;
    if (rating) filter.rating = { $gte: Number(rating) };

    if (minPrice || maxPrice) {
      filter.price = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
      };
    }

    const sortMap: Record<string, Record<string, number>> = {
      "Most Popular": { enrolledCount: -1 },
      "Highest Rated": { rating: -1 },
      Newest: { createdAt: -1 },
      "Price: Low to High": { price: 1 },
      "Price: High to Low": { price: -1 },
    };

    const sortOption = sortMap[sort as string] || { enrolledCount: -1 };

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort(sortOption as any)
        .skip(skip)
        .limit(limitNum)
        .populate("instructor", "firstName lastName email avatar")
        .select("-sections -totalViews"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Courses fetched successfully", {
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

// ─── 4. Get All Courses for Admin Dashboard ( - Admin Only)
export const getAllCoursesAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, search, page = "1", limit = "10" } = req.query;

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("instructor", "firstName lastName email avatar"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Admin course list fetched successfully", {
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

// ─── 5. Get Single Course by Slug (Public)
export const getCourseBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const course = await CourseModel.findOne({
      slug,
      status: "published",
    })
      .populate("instructor", "fullName email avatar bio experienceYears badge")
      .select("-totalViews");

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    //  Analytics: Record Course View
    try {
      const ipAddress = (req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip) as string;
      const userId = (req as any).user?.id || (req as any).user?._id || null;

      // Check for view in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const viewQuery: any = {
        course: course._id,
        createdAt: { $gte: twentyFourHoursAgo },
      };

      if (userId) {
        viewQuery.user = userId;
      } else {
        viewQuery.ipAddress = ipAddress;
      }

      const recentView = await CourseViewModel.findOne(viewQuery);

      if (!recentView) {
        // Record new view
        await CourseViewModel.create({
          course: course._id,
          user: userId,
          ipAddress: ipAddress,
        });

        // Increment total views safely
        await CourseModel.findByIdAndUpdate(course._id, {
          $inc: { totalViews: 1 },
        });
      }
    } catch (analyticsError) {
      console.error("Failed to record course view:", analyticsError);
    }

    const courseObj = course.toObject();

    // Check user access permissions for videos
    let hasAccess = false;
    if ((req as any).user && (req as any).user.id) {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const instructorId =
        (courseObj.instructor as any)?._id?.toString() ||
        courseObj.instructor?.toString();

      if (userRole === "admin" || userId === instructorId) {
        hasAccess = true;
      } else {
        const enrollment = await EnrollmentModel.findOne({
          course: courseObj._id,
          student: userId,
          paymentStatus: "completed",
        });
        if (enrollment) {
          hasAccess = true;
        }
      }
    }

    // Calculate instructor stats dynamically
    if (courseObj.instructor && (courseObj.instructor as any)._id) {
      const instructorObj = courseObj.instructor as any;
      const instructorCourses = await CourseModel.find({
        instructor: instructorObj._id,
        status: "published",
      }).select("enrolledCount rating");

      const totalCourses = instructorCourses.length;
      const totalStudents = instructorCourses.reduce(
        (sum, c) => sum + (c.enrolledCount || 0),
        0,
      );

      const coursesWithRating = instructorCourses.filter((c) => c.rating > 0);
      const averageRating =
        coursesWithRating.length > 0
          ? coursesWithRating.reduce((sum, c) => sum + (c.rating || 0), 0) /
            coursesWithRating.length
          : 0;

      instructorObj.totalCourses = totalCourses;
      instructorObj.totalStudents = totalStudents;
      instructorObj.rating = Number(averageRating.toFixed(1));
    }

    const sanitizedSections = (courseObj.sections || []).map((section: any) => {
      return {
        ...section,
        lessons: (section.lessons || []).map((lesson: any) => ({
          ...lesson,
          videoUrl: lesson.isFree || hasAccess ? lesson.videoUrl : null,
        })),
      };
    });

    sendResponse(res, 200, true, "Course fetched successfully", {
      ...courseObj,
      sections: sanitizedSections,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 6. Get Instructor's Own Courses
export const getInstructorCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const { status, page = "1", limit = "10" } = req.query;

    const filter: Record<string, unknown> = { instructor: instructorId };
    if (status && status !== "all") filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-sections"),
      CourseModel.countDocuments(filter),
    ]);

    sendResponse(res, 200, true, "Instructor courses fetched successfully", {
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

// ─── 6.5 Get Instructor Course Stats
export const getInstructorCourseStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const [totalCourses, published, pending, draft, rejected, suspended] =
      await Promise.all([
        CourseModel.countDocuments({ instructor: instructorId }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "published",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "pending",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "draft",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "rejected",
        }),
        CourseModel.countDocuments({
          instructor: instructorId,
          status: "suspended",
        }),
      ]);

    sendResponse(
      res,
      200,
      true,
      "Instructor course stats fetched successfully",
      {
        totalCourses,
        published,
        pending,
        draft,
        rejected,
        suspended,
      },
    );
  } catch (error) {
    next(error);
  }
};

// ─── 7. Update Course & Handle Publish Requests (Optimized)
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const course = await CourseModel.findOne({
      _id: id,
      instructor: instructorId,
    });

    if (!course) {
      return next(createHttpError(404, "Course not found or unauthorized"));
    }

    const allowedFields = [
      "title",
      "subtitle",
      "description",
      "price",
      "estimatedPrice",
      "thumbnail",
      "category",
      "level",
      "language",
      "tags",
      "sections",
      "hasCertificate",
      "requirements",
      "whatYouLearn",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.status !== undefined) {
      if (updates.status === "published") {
        return next(
          createHttpError(
            403,
            "Instructors cannot publish courses directly. Please request a review.",
          ),
        );
      }

      const allowedStatuses = ["draft", "pending"];
      if (!allowedStatuses.includes(updates.status as string)) {
        return next(createHttpError(400, "Invalid status update request"));
      }
    }

    if (course.status === "published") {
      updates.status = "pending";
    }

    Object.assign(course, updates);
    await course.save();

    sendResponse(res, 200, true, "Course updated successfully", course);
  } catch (error) {
    next(error);
  }
};

// ─── 8. Delete Course
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const course = await CourseModel.findById(id);

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    if (
      userRole !== "admin" &&
      course.instructor.toString() !== userId.toString()
    ) {
      return next(createHttpError(403, "Unauthorized to delete this course"));
    }

    if (
      userRole === "admin" &&
      course.status !== "draft" &&
      course.status !== "rejected"
    ) {
      return next(
        createHttpError(
          400,
          "Admins can only delete courses in 'draft' or 'rejected' status. For 'published' courses, use suspend.",
        ),
      );
    }

    // Check for active enrollments
    const enrollmentsCount = await EnrollmentModel.countDocuments({
      course: id,
    });
    if (enrollmentsCount > 0) {
      return next(
        createHttpError(
          400,
          "Cannot delete course because there are active enrollments.",
        ),
      );
    }

    await CourseModel.findByIdAndDelete(id);

    sendResponse(res, 200, true, "Course deleted successfully from EduNext");
  } catch (error) {
    next(error);
  }
};

// ─── 9. Update Course Status (Admin Only)
export const updateCourseStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectedReason, suspendedReason, badge } = req.body;

    const validStatuses = [
      "draft",
      "pending",
      "published",
      "rejected",
      "suspended",
    ];

    if (!validStatuses.includes(status)) {
      return next(
        createHttpError(
          400,
          `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`,
        ),
      );
    }

    const course = await CourseModel.findById(id);
    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    // Enforce status transition rules
    if (
      status === "published" &&
      !["pending", "suspended"].includes(course.status)
    ) {
      return next(
        createHttpError(
          400,
          "Cannot approve or unsuspend a course unless it is in 'pending' or 'suspended' status.",
        ),
      );
    }

    if (status === "suspended" && course.status !== "published") {
      return next(
        createHttpError(
          400,
          "Cannot suspend a course unless it is currently 'published'.",
        ),
      );
    }

    const updates: Record<string, unknown> = { status };

    if (status === "rejected") {
      if (!rejectedReason) {
        return next(
          createHttpError(
            400,
            "Rejection reason is required when status is rejected",
          ),
        );
      }
      updates.rejectedReason = rejectedReason;
    } else {
      updates.rejectedReason = null;
    }

    if (status === "suspended") {
      if (!suspendedReason) {
        return next(
          createHttpError(
            400,
            "Suspension reason is required when status is suspended",
          ),
        );
      }
      updates.suspendedReason = suspendedReason;
    } else {
      updates.suspendedReason = null;
    }

    if (status === "published" && badge !== undefined) {
      updates.badge = badge;
    }

    const updatedCourse = await CourseModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).populate("instructor", "firstName lastName email");

    if (!updatedCourse) {
      return next(createHttpError(404, "Failed to update course"));
    }

    sendResponse(
      res,
      200,
      true,
      `Course status updated to ${status} successfully`,
      updatedCourse,
    );
  } catch (error) {
    next(error);
  }
};

// ─── 10. Request Publish Course (Instructor Only)
export const requestCoursePublish = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const course = await CourseModel.findOne({
      _id: id,
      instructor: instructorId,
    });

    if (!course) {
      return next(createHttpError(404, "Course not found or unauthorized"));
    }

    if (course.status !== "draft" && course.status !== "rejected") {
      return next(
        createHttpError(
          400,
          "Only 'draft' or 'rejected' courses can be submitted for review.",
        ),
      );
    }

    course.status = "pending";
    await course.save();

    sendResponse(
      res,
      200,
      true,
      "Course publish request submitted successfully. It is now pending admin review.",
      course,
    );
  } catch (error) {
    next(error);
  }
};

// ─── 11. Get Course For Playback (Enrolled Students Only)
export const getCourseForPlayback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courseId = req.params.id as string;
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return next(createHttpError(401, "Authentication required"));
    }

    const course = await CourseModel.findById(courseId).select(
      "title slug sections lessonsCount totalDuration hasCertificate",
    );

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    // Check Access (Admin, Instructor, or Enrolled Student)
    let hasAccess = false;
    const instructorId = course.instructor?.toString();

    if (userRole === "admin" || userId.toString() === instructorId) {
      hasAccess = true;
    } else {
      const enrollment = await EnrollmentModel.findOne({
        course: courseId,
        student: userId,
        paymentStatus: "completed",
      });
      if (enrollment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return next(
        createHttpError(
          403,
          `You must be enrolled in this course to access the playback dashboard (courseId: ${courseId}, studentId: ${userId})`,
        ),
      );
    }

    // Fetch User Progress
    const progress = await ProgressModel.findOne({
      course: courseId,
      student: userId,
    });

    const completedLessons = progress ? progress.completedLessons : [];
    const isCourseCompleted = progress ? progress.isCourseCompleted : false;
    const completedLessonsCount = completedLessons.length;
    const totalLessons = course.lessonsCount || 0;
    const percentage =
      totalLessons > 0
        ? Math.round((completedLessonsCount / totalLessons) * 100)
        : 0;

    res.status(200).json({
      success: true,
      message: "Course playback data fetched successfully",
      data: {
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          totalDuration: course.totalDuration,
          lessonsCount: course.lessonsCount,
          hasCertificate: course.hasCertificate,
          sections: course.sections,
        },
        progress: {
          completedLessons,
          completedLessonsCount,
          percentage,
          isCourseCompleted,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
