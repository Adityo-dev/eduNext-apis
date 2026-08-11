import cron from "node-cron";
import { ProgressModel } from "../../progress/models/progressModel.js";
import AuthModel from "../../auth/models/authModel.js";
import { sendEmail } from "../../utils/sendEmail.js";

/**
 * Streak Reminder Cron Job
 * Runs every day at 8:00 PM (20:00) Bangladesh time.
 *
 * Logic:
 * 1. Find all students who have completed lessons.
 * 2. For each student, check the last 7 days of lesson completions.
 * 3. If they have a 5 or 6 day consecutive streak (but NOT 7 — that means they already earned the badge),
 *    AND they did NOT complete any lesson TODAY, send them a motivational email.
 */

export const startStreakReminderCron = (): void => {
  cron.schedule(
    "0 20 * * *", // Every day at 8:00 PM
    async () => {
      try {
        console.log("🔥 Streak Reminder Cron: Running...");

        const now = new Date();
        const todayStr = now.toISOString().split("T")[0] as string;

        // Get all progress documents that have completed lessons
        const allProgresses = await ProgressModel.find({
          "completedLessons.0": { $exists: true },
        });

        // Group completedAt dates by student
        const studentDatesMap = new Map<string, Set<string>>();

        allProgresses.forEach((p) => {
          const sId = p.student.toString();
          if (!studentDatesMap.has(sId)) {
            studentDatesMap.set(sId, new Set());
          }
          const dateSet = studentDatesMap.get(sId)!;

          p.completedLessons.forEach((cl: any) => {
            if (cl.completedAt) {
              const dateStr = new Date(cl.completedAt)
                .toISOString()
                .split("T")[0] as string;
              dateSet.add(dateStr);
            }
          });
        });

        // Check each student for a 5-6 day streak ending yesterday
        const studentsToNotify: string[] = [];

        for (const [studentId, dateSet] of studentDatesMap.entries()) {
          // If student already completed a lesson today, no need to remind
          if (dateSet.has(todayStr)) {
            continue;
          }

          // Check consecutive days going backwards from yesterday
          let streakCount = 0;
          for (let d = 1; d <= 7; d++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() - d);
            const checkDateStr = checkDate
              .toISOString()
              .split("T")[0] as string;

            if (dateSet.has(checkDateStr)) {
              streakCount++;
            } else {
              break; // Streak broken
            }
          }

          // Only notify if streak is 5 or 6 days (close to 7-Day badge)
          if (streakCount >= 5 && streakCount < 7) {
            studentsToNotify.push(studentId);
          }
        }

        if (studentsToNotify.length === 0) {
          console.log("🔥 Streak Reminder Cron: No students to notify.");
          return;
        }

        // Fetch student details
        const students = await AuthModel.find({
          _id: { $in: studentsToNotify },
        });

        for (const student of students) {
          const studentName =
            (student as any).fullName ||
            (student as any).firstName ||
            "Student";
          const studentEmail = (student as any).email;

          if (!studentEmail) continue;

          // Find their current streak
          const dateSet = studentDatesMap.get(student._id.toString());
          let streakDays = 0;
          for (let d = 1; d <= 7; d++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() - d);
            const checkDateStr = checkDate
              .toISOString()
              .split("T")[0] as string;
            if (dateSet?.has(checkDateStr)) {
              streakDays++;
            } else {
              break;
            }
          }

          const daysRemaining = 7 - streakDays;

          const emailHtml = `
          <div style="background-color: #F0FDF4; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #BBF7D0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">🔥</span>
              </div>

              <h2 style="color: #166534; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
                Don't Break Your Streak!
              </h2>

              <p style="text-align: center; color: #4B5563; font-size: 15px; margin: 0 0 24px 0;">
                You're so close to the <strong>7-Day Streak</strong> badge! 🏅
              </p>

              <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                Hey ${studentName},
              </p>

              <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
                You've been on an amazing <strong style="color: #166534;">${streakDays}-day learning streak</strong>! 
                Just <strong style="color: #DC2626;">${daysRemaining} more day${daysRemaining > 1 ? "s" : ""}</strong> 
                and you'll unlock the exclusive <strong>🔥 7-Day Streak</strong> achievement badge.
              </p>

              <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
                Don't let your hard work go to waste — complete just one lesson today to keep the streak alive!
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="https://edunext-six.vercel.app/dashboard/student/overview" 
                   style="background-color: #166534; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 10px; display: inline-block; font-size: 15px; letter-spacing: 0.3px;">
                  Continue Learning
                </a>
              </div>

              <div style="background-color: #F0FDF4; border-radius: 10px; padding: 16px; text-align: center; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #6B7280;">
                  Your current streak: <strong style="color: #166534;">${streakDays} / 7 days</strong>
                </p>
                <div style="background-color: #E5E7EB; border-radius: 999px; height: 8px; margin-top: 10px; overflow: hidden;">
                  <div style="background-color: #22C55E; height: 100%; width: ${Math.round((streakDays / 7) * 100)}%; border-radius: 999px;"></div>
                </div>
              </div>

              <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px;">
                You're receiving this because you're close to earning an achievement on EduNext.
              </p>
            </div>
          </div>
          `;

          sendEmail({
            email: studentEmail,
            subject: `🔥 ${streakDays}-Day Streak! Don't stop now, ${studentName}!`,
            html: emailHtml,
          }).catch((err) =>
            console.error(
              `Failed sending streak reminder to ${studentEmail}`,
              err,
            ),
          );

          console.log(
            `🔥 Streak Reminder sent to ${studentName} (${studentEmail}) — ${streakDays} day streak`,
          );
        }

        console.log(
          `🔥 Streak Reminder Cron: Notified ${studentsToNotify.length} student(s).`,
        );
      } catch (error) {
        console.error("Error in Streak Reminder Cron Job:", error);
      }
    },
    {
      timezone: "Asia/Dhaka",
    },
  );
};
