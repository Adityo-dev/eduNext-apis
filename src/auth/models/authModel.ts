import { Schema, model } from "mongoose";
import type { IUserDocument } from "../types/authType.js";

const authSchema = new Schema<IUserDocument>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      minlength: [11, "Phone number must be at least 11 digits"],
      maxlength: [14, "Phone number cannot exceed 14 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    areaOfExpertise: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
      default: "",
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    githubUrl: {
      type: String,
      default: "",
    },
    badge: {
      type: String,
      enum: ["none", "bronze", "silver", "blue"],
      default: "none",
    },
    badgeRequest: {
      requestedBadge: {
        type: String,
        enum: ["none", "bronze", "silver", "blue"],
        default: "none",
      },
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      requestedAt: { type: Date },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Dynamic Fullname Generate
authSchema.pre("save", function () {
  if (this.firstName || this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }
});

const AuthModel = model<IUserDocument>("User", authSchema);
export default AuthModel;
