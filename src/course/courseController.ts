import type { Request, Response } from "express";
import CourseModel from "./courseModel.js";

// ─── Helper Response Function ─────────────────────────────────────────────────
const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

// ─── 1. Create Course ─────────────────────────────────────────────────────────
export const createCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // মিডলওয়্যার থেকে ইউজার আইডি বের করার প্রফেশনাল ও সেফ ওয়ে
  const instructorId = (req as any).user?._id || (req as any).user?.id;

  if (!instructorId) {
    res.status(401);
    throw new Error("Instructor authentication failed");
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

  // রিকোয়ার্ড ফিল্ড ভ্যালিডেশন চেক
  if (!title || !subtitle || !description || !price || !category) {
    res.status(400);
    throw new Error(
      "Please provide all required fields (title, subtitle, description, price, category)",
    );
  }

  const lessonsCount = Array.isArray(sections)
    ? sections.reduce(
        (total: number, section: any) => total + (section.lessons?.length || 0),
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
    status: "draft", // ডিফল্ট স্ট্যাটাস ড্রাফট থাকবে
  });

  sendResponse(
    res,
    201,
    true,
    "Course created successfully as a draft",
    course,
  );
};

// ─── 2. Get All Courses (Public) ──────────────────────────────────────────────
export const getAllCourses = async (
  req: Request,
  res: Response,
): Promise<void> => {
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

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, parseInt(limit as string));
  const skip = (pageNum - 1) * limitNum;

  const [courses, total] = await Promise.all([
    CourseModel.find(filter)
      .sort(sortOption)
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
};

// ─── 3. Get Single Course by Slug (Public) ────────────────────────────────────
export const getCourseBySlug = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { slug } = req.params;

  const course = await CourseModel.findOne({
    slug,
    status: "published",
  }).populate(
    "instructor",
    "firstName lastName email avatar bio totalStudents totalCourses rating",
  );

  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  // নন-এনরোলড স্টুডেন্টদের জন্য সিক্রেট ভিডিও ইউআরএল হাইড করার লজিক (শুধু ফ্রি ভিডিওগুলো দেখাবে)
  const sanitizedSections = course.sections.map((section) => ({
    ...section.toObject(),
    lessons: section.lessons.map((lesson) => ({
      ...lesson.toObject(),
      videoUrl: lesson.isFree ? lesson.videoUrl : null,
    })),
  }));

  sendResponse(res, 200, true, "Course fetched successfully", {
    ...course.toObject(),
    sections: sanitizedSections,
  });
};

// ─── 4. Get Instructor's Own Courses ─────────────────────────────────────────
export const getInstructorCourses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const instructorId = (req as any).user?._id || (req as any).user?.id;
  const { status, page = "1", limit = "10" } = req.query;

  const filter: Record<string, unknown> = { instructor: instructorId };
  if (status && status !== "all") filter.status = status;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = parseInt(limit as string);
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
};

// ─── 5. Update Course ─────────────────────────────────────────────────────────
export const updateCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const instructorId = (req as any).user?._id || (req as any).user?.id;

  const course = await CourseModel.findOne({
    _id: id,
    instructor: instructorId,
  });

  if (!course) {
    res.status(404);
    throw new Error("Course not found or unauthorized");
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
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // রুলস: কোনো কোর্স পাবলিশড থাকা অবস্থায় এডিট হলে তার স্ট্যাটাস আবার 'pending' এ চলে যাবে যাতে অ্যাডমিন আবার রিভিও করতে পারে
  if (course.status === "published") {
    updates.status = "pending";
  }

  // findByIdAndUpdate এর বদলে save হুক ফায়ার করার জন্য ইউজার অবজেক্ট ম্যানিপুলেশন করা হয়েছে (যাতে লেসন কাউন্ট আপডেট হয়)
  Object.assign(course, updates);
  await course.save();

  sendResponse(res, 200, true, "Course updated successfully", course);
};

// ─── 6. Delete Course ─────────────────────────────────────────────────────────
export const deleteCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user?._id || (req as any).user?.id;
  const userRole = (req as any).user?.role;

  // অ্যাডমিন হলে যেকোনো কোর্স ডিলেট করতে পারবে, ইনস্ট্রাক্টর হলে শুধু নিজের কোর্স
  const filter =
    userRole === "admin" ? { _id: id } : { _id: id, instructor: userId };

  const course = await CourseModel.findOneAndDelete(filter);

  if (!course) {
    res.status(404);
    throw new Error("Course not found or unauthorized");
  }

  sendResponse(res, 200, true, "Course deleted successfully from EduNext");
};

// ─── 7. Update Course Status (Admin Only) ────────────────────────────────────
export const updateCourseStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status, rejectedReason, badge } = req.body;

  const validStatuses = ["draft", "pending", "published", "rejected"];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`,
    );
  }

  const updates: Record<string, unknown> = { status };

  if (status === "rejected") {
    if (!rejectedReason) {
      res.status(400);
      throw new Error("Rejection reason is required when status is rejected");
    }
    updates.rejectedReason = rejectedReason;
  } else {
    updates.rejectedReason = null; // ক্লিয়ার করে দেওয়া হলো যদি আগে রিজেক্টেড থাকে
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
    res.status(404);
    throw new Error("Course not found");
  }

  sendResponse(
    res,
    200,
    true,
    `Course status updated to ${status} successfully`,
    course,
  );
};
