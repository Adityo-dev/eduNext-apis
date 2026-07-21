import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { EnrollmentModel } from "../../../enrollment/enrollmentModel.js";
import { sendEmail } from "../../../utils/sendEmail.js";
import LiveSessionModel from "../../models/liveSessionModel.js";

// ─── 2. Update Live session Stats And Link (Instructor Only)
export const updateLiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const instructor = (req as any).user;
    const instructorId = instructor?._id || instructor?.id;

    // validate sessionId to satisfy mongoose filter types
    if (!sessionId || Array.isArray(sessionId)) {
      return next(createHttpError(400, "Invalid sessionId parameter"));
    }

    const queryFilter: any = {
      _id: sessionId,
      instructor: instructorId,
    };

    const session = await LiveSessionModel.findOne(queryFilter);
    if (!session) {
      return next(
        createHttpError(404, "Live session not found or unauthorized"),
      );
    }

    let isJustGoingLive = false;
    if (req.body.status === "live" && session.status !== "live") {
      isJustGoingLive = true;
    }

    const allowedUpdates = [
      "title",
      "description",
      "meetingLink",
      "meetingPlatform",
      "startTime",
      "durationInMins",
      "status",
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "startTime") {
          session.startTime = new Date(req.body.startTime);
          session.isReminderSent = false;
        } else {
          (session as any)[key] = req.body[key];
        }
      }
    }

    await session.save();

    // Send email to all students if session just went live
    if (isJustGoingLive) {
      const enrollments = await EnrollmentModel.find({
        course: session.course,
      }).populate("student", "email firstName");

      const instructorName = instructor?.firstName || "Instructor";

      for (const enrollment of enrollments) {
        const student = enrollment.student as any;
        if (student?.email) {
          const emailHtml = `
          <div style="background-color: #F9FAFB; padding: 40px 10px; font-family: sans-serif;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #E5E7EB;">
              <h2 style="color: #10B981; text-align: center;">🟢 Class is Live Now!</h2>
              <p style="font-size: 16px; color: #374151;">Hello ${student.firstName || "Student"},</p>
              <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">Your instructor <strong>${instructorName}</strong> has just started the live session <strong>"${session.title}"</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${session.meetingLink}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Join Now</a>
              </div>
            </div>
          </div>
        `;
          // Send asynchronously without awaiting to prevent delaying the response
          sendEmail({
            email: student.email,
            subject: `🔴 LIVE NOW: ${session.title}`,
            html: emailHtml,
          }).catch((err) =>
            console.error(`Failed sending live email to ${student.email}`, err),
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Live session updated successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
