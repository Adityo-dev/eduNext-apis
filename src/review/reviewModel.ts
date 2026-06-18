import { Document, Schema, Types, model } from "mongoose";

export interface IReview extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.index({ student: 1, course: 1 }, { unique: true });

export const ReviewModel = model<IReview>("Review", reviewSchema);
