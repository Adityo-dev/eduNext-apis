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
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        await LiveSessionModel.updateMany(
          { startTime: { $lte: twelveHoursAgo }, status: "live" },
          { $set: { status: "completed" } },
        );

        // Notification Reminder 10 mints
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);
        const upcomingSessions = await LiveSessionModel.find({
          startTime: { $lte: tenMinutesFromNow, $gt: now },
          status: "upcoming",
          isReminderSent: false,
        }).populate("instructor", "firstName lastName fullName");

        for (const session of upcomingSessions) {
          const enrollments = await EnrollmentModel.find({
            course: session.course,
          }).populate("student", "email firstName fullName");

          const instructorName =
            (session.instructor as any)?.fullName ||
            (session.instructor as any)?.firstName ||
            "Instructor";

          for (const enrollment of enrollments) {
            const student = enrollment.student as any;
            if (student?.email) {
              const emailHtml = `
              <div style="background-color: #EEF2FF; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #C7D2FE; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                  
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 42px;">⏰</span>
                  </div>

                  <h2 style="color: #4338CA; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
                    Live Class Starting Soon!
                  </h2>

                  <p style="text-align: center; color: #64748B; font-size: 14px; margin: 0 0 24px 0;">
                    Your session begins in 10 minutes
                  </p>

                  <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello ${student.fullName || student.firstName || "Student"},
                  </p>

                  <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
                    Your live session <strong style="color: #4338CA;">"${session.title}"</strong> by <strong>${instructorName}</strong> is starting in 10 minutes!
                  </p>

                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${session.meetingLink}" 
                       style="background-color: #4338CA; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 10px; display: inline-block; font-size: 15px;">
                      Join Live Class →
                    </a>
                  </div>

                  <div style="border-top: 1px solid #E2E8F0; margin-top: 28px; padding-top: 16px; text-align: center;">
                    <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
                      © ${new Date().getFullYear()} EduNext · Live Learning
                    </p>
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
