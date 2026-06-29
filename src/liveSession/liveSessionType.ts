import type { Document, Types } from "mongoose";

export interface ILiveSession extends Document {
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  title: string;
  description?: string;
  meetingLink: string;
  meetingPlatform: "Zoom" | "Google Meet" | "Custom";
  startTime: Date;
  durationInMins: number;
  status: "upcoming" | "live" | "completed";
  joinedStudents: Types.ObjectId[];
  isReminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
