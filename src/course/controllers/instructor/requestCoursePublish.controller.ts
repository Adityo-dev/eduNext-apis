import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../models/courseModel.js";
import { sendAdminNotification } from "../../../notification/services/notificationService.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

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

    await course.populate("instructor", "fullName");

    sendAdminNotification(
      "New Course Submitted",
      `${course.title} by ${(course.instructor as any)?.fullName || "an instructor"} is pending review.`,
      "course_submitted",
    ).catch(console.error);

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
