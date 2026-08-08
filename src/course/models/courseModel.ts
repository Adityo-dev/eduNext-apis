import crypto from "crypto";
import { Schema, model } from "mongoose";
import type { ICourseDocument } from "../types/courseType.js";

// ─── Lesson Schema ─
const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: String, default: "00:00" },
    videoUrl: { type: String },
    isFree: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  { _id: true },
);

// ─── Section Schema
const sectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    lessons: [lessonSchema],
  },
  { _id: true },
);

// ─── Course Schema ─
const courseSchema = new Schema<ICourseDocument>(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    subtitle: {
      type: String,
      required: [true, "Course subtitle is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
    },

    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
    },
    estimatedPrice: {
      type: Number,
      min: [0, "Estimated price cannot be negative"],
    },

    thumbnail: {
      type: String,
      required: [true, "Course thumbnail is required"],
    },

    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    language: {
      type: String,
      enum: ["Bangla", "English", "Hindi"],
      default: "Bangla",
    },
    tags: [{ type: String }],

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor ID is required"],
    },

    // Curriculum
    sections: [sectionSchema],
    lessonsCount: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: String,
      default: "0 hrs",
    },

    enrolledCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },

    hasCertificate: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["draft", "pending", "published", "rejected", "suspended"],
      default: "draft",
    },
    rejectedReason: {
      type: String,
      default: null,
    },
    suspendedReason: {
      type: String,
      default: null,
    },
    badge: {
      type: String,
      enum: ["Best Seller", "Top Rated", "New", null],
      default: null,
    },

    requirements: { type: String, default: "" },
    whatYouLearn: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Mongoose Hooks (Pre-save Middleware)
courseSchema.pre("save", function (this: ICourseDocument) {
  // auto generate slug
  if (this.isModified("title")) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const uniqueId = crypto.randomBytes(3).toString("hex");
    this.slug = `${baseSlug}-${uniqueId}`;
  }

  //  auto calculate lessons count and total duration
  if (this.isModified("sections")) {
    let totalLessons = 0;
    let totalSeconds = 0;

    this.sections.forEach((section: any) => {
      if (section.lessons && Array.isArray(section.lessons)) {
        totalLessons += section.lessons.length;

        section.lessons.forEach((lesson: any) => {
          if (lesson.duration) {
            const parts = lesson.duration.split(":").map(Number);
            if (parts.length === 2) {
              // MM:SS
              totalSeconds += parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              // HH:MM:SS
              totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 1 && !isNaN(parts[0])) {
              // Just minutes
              totalSeconds += parts[0] * 60;
            }
          }
        });
      }
    });

    this.lessonsCount = totalLessons;

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const durationParts = [];
    if (hrs > 0) durationParts.push(`${hrs} hr${hrs > 1 ? "s" : ""}`);
    if (mins > 0) durationParts.push(`${mins} min${mins > 1 ? "s" : ""}`);
    if (secs > 0) durationParts.push(`${secs} sec${secs > 1 ? "s" : ""}`);

    this.totalDuration =
      durationParts.length > 0 ? durationParts.join(" ") : "0 mins";
  }
});

const CourseModel = model<ICourseDocument>("Course", courseSchema);
export default CourseModel;
