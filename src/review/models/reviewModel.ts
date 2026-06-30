import { Schema, model } from "mongoose";
import type { IReview } from "../types/reviewType.js";

const reviewSchema = new Schema<IReview>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.index({ student: 1, course: 1 }, { unique: true });

export const ReviewModel = model<IReview>("Review", reviewSchema);
