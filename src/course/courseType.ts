import { Document, Types } from "mongoose";

// ─── Lesson Interface ───────────────────────────────────────────────────────────
export interface ILesson {
  title: string;
  duration: string; // e.g. "10:30"
  videoUrl?: string;
  isFree: boolean;
  order: number;
}

// ─── Section Interface ──────────────────────────────────────────────────────────
export interface ISection {
  title: string;
  order: number;
  lessons: ILesson[];
}

// ─── Course Interface ───────────────────────────────────────────────────────────
export interface ICourse {
  title: string;
  slug: string;
  subtitle: string;
  description: string;

  // Pricing
  price: number;
  estimatedPrice?: number; // original price (before discount)

  // Media
  thumbnail: string;

  // Classification
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  language: "বাংলা" | "English";
  tags?: string[];

  // Instructor
  instructor: Types.ObjectId;

  // Curriculum
  sections: ISection[];
  lessonsCount: number;
  totalDuration: string; // e.g. "24 hrs"

  // Stats
  enrolledCount: number;
  rating: number;
  totalReviews: number;

  // Certificate
  hasCertificate: boolean;

  // Status
  status: "draft" | "pending" | "published" | "rejected";
  rejectedReason?: string | null; // Admin rejection reason
  badge?: "Best Seller" | "Top Rated" | "New" | null;

  // Requirements
  requirements: string[];
  whatYouLearn: string[];
}

export interface ICourseDocument extends ICourse, Document {
  createdAt: Date;
  updatedAt: Date;
}
