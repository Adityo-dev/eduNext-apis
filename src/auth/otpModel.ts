import { Document, Schema, model } from "mongoose";

export interface IOtpDocument extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const otpSchema = new Schema<IOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // PERFORMANCE FIX: Index on email for fast findOne & deleteMany lookups
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // FIX: Changed from 300s (5 min) to 600s (10 min) to match the email template that says "valid for 10 minutes"
    },
  },
  { versionKey: false },
);

const OtpModel = model<IOtpDocument>("Otp", otpSchema);
export default OtpModel;
