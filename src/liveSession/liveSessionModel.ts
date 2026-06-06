import { model, Schema } from "mongoose";
import type { ILiveSession } from "./liveSessionType.js";

const liveSessionSchema = new Schema<ILiveSession>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor reference is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    meetingLink: {
      type: String,
      required: [true, "Meeting link is required"],
      trim: true,
    },
    meetingPlatform: {
      type: String,
      enum: ["Zoom", "Google Meet"],
      default: "Zoom",
    },
    startTime: {
      type: Date,
      required: [true, "Start time and date are required"],
    },
    durationInMins: {
      type: Number,
      required: [true, "Duration is required"],
      default: 60,
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

liveSessionSchema.index({ course: 1, startTime: 1 });

const LiveSessionModel = model<ILiveSession>("LiveSession", liveSessionSchema);
export default LiveSessionModel;
