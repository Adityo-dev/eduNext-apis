import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "./courseModel.js";

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
      totalDuration,
    } = req.body;

    // Validation
    if (!title || !subtitle || !description || !price || !category) {
      return next(
        createHttpError(
          400,
          "Please provide all required fields (title, subtitle, description, price, category)",
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
      totalDuration: totalDuration || "0 hrs",
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
        .select("-sections"),
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
    }).populate(
      "instructor",
      "firstName lastName email avatar bio totalStudents totalCourses rating",
    );

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    const sanitizedSections = (course.sections || []).map((section: any) => {
      const sectionObj =
        typeof section.toObject === "function" ? section.toObject() : section;
      return {
        ...sectionObj,
        lessons: (sectionObj.lessons || []).map((lesson: any) => ({
          ...lesson,
          videoUrl: lesson.isFree ? lesson.videoUrl : null,
        })),
      };
    });

    sendResponse(res, 200, true, "Course fetched successfully", {
      ...course.toObject(),
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
      "totalDuration",
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

    // সেকশন আপডেট হলে লেসন সংখ্যা রিক্যালকুলেট করা
    if (updates.sections && Array.isArray(updates.sections)) {
      updates.lessonsCount = updates.sections.reduce(
        (total: number, section: any) => total + (section.lessons?.length || 0),
        0,
      );
    }

    // কোর্সটি অলরেডি পাবলিশড থাকলে, যেকোনো এডিটের পর সেটি আবার রিভিউতে (pending) চলে যাবে
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

    const filter =
      userRole === "admin" ? { _id: id } : { _id: id, instructor: userId };

    const course = await CourseModel.findOneAndDelete(filter);

    if (!course) {
      return next(createHttpError(404, "Course not found or unauthorized"));
    }

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
    const { status, rejectedReason, badge } = req.body;

    const validStatuses = ["draft", "pending", "published", "rejected"];

    if (!validStatuses.includes(status)) {
      return next(
        createHttpError(
          400,
          `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`,
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

    if (status === "published" && badge !== undefined) {
      updates.badge = badge;
    }

    const course = await CourseModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).populate("instructor", "firstName lastName email");

    if (!course) {
      return next(createHttpError(404, "Course not found"));
    }

    sendResponse(
      res,
      200,
      true,
      `Course status updated to ${status} successfully`,
      course,
    );
  } catch (error) {
    next(error);
  }
};
