import { Document, Schema, Types, model } from "mongoose";

export interface IProgress extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  completedLessons: Types.ObjectId[];
  isCourseCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completedLessons: [
      { type: Schema.Types.ObjectId, ref: "Lesson" }, // Although Lesson is an embedded schema in Course, saving the _id is standard practice
    ],
    isCourseCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// Ensure a student has only one progress document per course
progressSchema.index({ student: 1, course: 1 }, { unique: true });

export const ProgressModel = model<IProgress>("Progress", progressSchema);
