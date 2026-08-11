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
      }).populate("student", "email firstName fullName");

      const instructorName =
        instructor?.fullName || instructor?.firstName || "Instructor";

      for (const enrollment of enrollments) {
        const student = enrollment.student as any;
        if (student?.email) {
          const emailHtml = `
          <div style="background-color: #ECFDF5; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #A7F3D0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 42px;">🟢</span>
              </div>

              <h2 style="color: #059669; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
                Class is Live Now!
              </h2>

              <p style="text-align: center; color: #64748B; font-size: 14px; margin: 0 0 24px 0;">
                Your instructor just started the session
              </p>

              <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                Hello ${student.fullName || student.firstName || "Student"},
              </p>

              <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
                Your instructor <strong>${instructorName}</strong> has just started the live session <strong style="color: #059669;">"${session.title}"</strong>.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${session.meetingLink}" 
                   style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 10px; display: inline-block; font-size: 15px;">
                  Join Now →
                </a>
              </div>

              <div style="border-top: 1px solid #A7F3D0; margin-top: 28px; padding-top: 16px; text-align: center;">
                <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
                  © ${new Date().getFullYear()} EduNext · Live Learning
                </p>
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
