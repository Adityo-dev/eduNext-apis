import { Schema, model } from "mongoose";
import type { ICourseDocument } from "./courseType.js";

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

    // Pricing
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
    },
    estimatedPrice: {
      type: Number,
      min: [0, "Estimated price cannot be negative"],
    },

    // Media
    thumbnail: {
      type: String,
      default: "https://placeholder.com/course-thumbnail.png",
    },

    // Classification
    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    language: {
      type: String,
      enum: ["বাংলা", "English"],
      default: "বাংলা",
    },
    tags: [{ type: String }],

    // Instructor
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

    // Stats
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

    // Certificate
    hasCertificate: {
      type: Boolean,
      default: true,
    },

    // Status
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

    // Requirements
    requirements: { type: String, default: "" },
    whatYouLearn: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Mongoose Hooks (Pre-save Middleware)
courseSchema.pre("save", function () {
  // auto generate slug
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  //  auto calculate lessons count and total duration
  if (this.isModified("sections")) {
    let totalLessons = 0;
    let totalMinutes = 0;

    this.sections.forEach((section: any) => {
      if (section.lessons && Array.isArray(section.lessons)) {
        totalLessons += section.lessons.length;
        
        section.lessons.forEach((lesson: any) => {
          if (lesson.duration) {
            const parts = lesson.duration.split(":").map(Number);
            if (parts.length === 2) {
              // MM:SS
              totalMinutes += parts[0] + parts[1] / 60;
            } else if (parts.length === 3) {
              // HH:MM:SS
              totalMinutes += parts[0] * 60 + parts[1] + parts[2] / 60;
            } else if (parts.length === 1 && !isNaN(parts[0])) {
              // Just minutes
              totalMinutes += parts[0];
            }
          }
        });
      }
    });

    this.lessonsCount = totalLessons;

    const roundedMinutes = Math.round(totalMinutes);
    const hrs = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    
    if (hrs > 0) {
      this.totalDuration = `${hrs} hrs ${mins} mins`;
    } else {
      this.totalDuration = `${mins} mins`;
    }
  }
});

const CourseModel = model<ICourseDocument>("Course", courseSchema);
export default CourseModel;
