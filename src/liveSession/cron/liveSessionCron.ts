import cron from "node-cron";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { sendEmail } from "../../utils/sendEmail.js";
import LiveSessionModel from "../models/liveSessionModel.js";

export const startLiveSessionCron = (): void => {
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const now = new Date();
        // Auto Live Stats Update
        await LiveSessionModel.updateMany(
          { startTime: { $lte: now }, status: "upcoming" },
          { $set: { status: "live" } },
        );

        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000,
        );
        await LiveSessionModel.updateMany(
          { startTime: { $lte: twentyFourHoursAgo }, status: "live" },
          { $set: { status: "completed" } },
        );

        // Notification Reminder 15 mints
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000);
        const upcomingSessions = await LiveSessionModel.find({
          startTime: { $lte: fifteenMinutesFromNow, $gt: now },
          status: "upcoming",
          isReminderSent: false,
        }).populate("instructor", "firstName lastName");

        for (const session of upcomingSessions) {
          const enrollments = await EnrollmentModel.find({
            course: session.course,
          }).populate("student", "email firstName");

          const instructorName =
            (session.instructor as any)?.firstName || "Instructor";

          for (const enrollment of enrollments) {
            const student = enrollment.student as any;
            if (student?.email) {
              const emailHtml = `
              <div style="background-color: #F9FAFB; padding: 40px 10px; font-family: sans-serif;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #E5E7EB;">
                  <h2 style="color: #4F46E5; text-align: center;">EduNext Live Class Reminder</h2>
                  <p style="font-size: 16px; color: #374151;">Hello ${student.firstName || "Student"},</p>
                  <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">Your live session <strong>"${session.title}"</strong> by <strong>${instructorName}</strong> is starting in 15 minutes!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${session.meetingLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Join Live Session Now</a>
                  </div>
                </div>
              </div>
            `;
              sendEmail({
                email: student.email,
                subject: `⏰ Live Class Starting Soon: ${session.title}`,
                html: emailHtml,
              }).catch((err) =>
                console.error(
                  `Failed sending reminder to ${student.email}`,
                  err,
                ),
              );
            }
          }

          session.isReminderSent = true;
          await session.save();
        }
      } catch (error) {
        console.error("Error in Live Session Cron Job:", error);
      }
    },
    {
      timezone: "Asia/Dhaka",
    },
  );
};
