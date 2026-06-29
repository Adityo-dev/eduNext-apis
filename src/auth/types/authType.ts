import { Document } from "mongoose";

export type UserRole = "student" | "instructor" | "admin";
export type BadgeType = "none" | "bronze" | "silver" | "blue";
export type RequestStatus = "none" | "pending" | "approved" | "rejected";

export interface IUser {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  areaOfExpertise: string[];
  avatar: string;
  coverPhoto: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  badge: BadgeType;
  badgeRequest: {
    requestedBadge: BadgeType;
    status: RequestStatus;
    requestedAt?: Date;
  };
  isEmailVerified: boolean;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}
