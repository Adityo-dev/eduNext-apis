import { startLiveSessionCron } from "../liveSession/cron/liveSessionCron.js";
import { startStreakReminderCron } from "../progress/cron/streakReminderCron.js";

export const initAllCronJobs = (): void => {
  console.log("⏰ Initializing Background Services...");

  startLiveSessionCron();
  startStreakReminderCron();

  console.log("✅ All Background Cron Jobs Loaded Successfully.");
};
