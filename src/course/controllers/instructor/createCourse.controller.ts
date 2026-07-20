import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { ProgressModel } from "../../../progress/models/progressModel.js";
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
