import { Document } from "mongoose";

// User Role
export type UserRole = "student" | "instructor" | "admin";

// User Interface
export interface IUser {
  fullName: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  areaOfExpertise: string[];
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User Document
export interface IUserDocument extends IUser, Document {}
