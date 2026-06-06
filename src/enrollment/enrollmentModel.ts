import { Document, Schema, Types, model } from "mongoose";

export interface IEnrollment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  pricePaid: number;
  paymentStatus: "pending" | "completed" | "refunded";
  createdAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    pricePaid: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      default: "completed",
    },
  },
  { timestamps: true, versionKey: false },
);

// একজন স্টুডেন্ট একটা কোর্স একবারই এনরোল করতে পারবে
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export const EnrollmentModel = model<IEnrollment>(
  "Enrollment",
  enrollmentSchema,
);
