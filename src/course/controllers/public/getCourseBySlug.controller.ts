import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import CourseModel from "../../models/courseModel.js";
import { CourseViewModel } from "../../models/courseViewModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

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
      .populate("instructor", "fullName avatar bio experienceYears badge")
      .select("-totalViews -rejectedReason -suspendedReason");

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
