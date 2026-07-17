import { Document, Schema, Types, model } from "mongoose";

export interface ICourseView extends Document {
  course: Types.ObjectId;
  user?: Types.ObjectId;
  ipAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const courseViewSchema = new Schema<ICourseView>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ipAddress: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Indexes for fast lookups (analytics and 24h checks)
courseViewSchema.index({ course: 1, ipAddress: 1, createdAt: -1 });
courseViewSchema.index({ course: 1, user: 1, createdAt: -1 });

export const CourseViewModel = model<ICourseView>(
  "CourseView",
  courseViewSchema,
);
