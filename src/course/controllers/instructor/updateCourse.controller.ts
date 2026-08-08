import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../models/courseModel.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

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
      "subCategory",
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
