import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../models/courseModel.js";
import { sendNotification } from "../../../notification/services/notificationService.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

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
    ).populate("instructor", "fullName email");

    if (!updatedCourse) {
      return next(createHttpError(404, "Failed to update course"));
    }

    if (status === "published" && course.status === "pending") {
      sendNotification(
        (updatedCourse.instructor as any)._id.toString(),
        "Course Approved!",
        `Your course "${updatedCourse.title}" has been approved and is now live.`,
        "course_approved",
      ).catch(console.error);
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
