export interface IUserStatusUpdate {
  status: "active" | "suspended";
}

export interface IInstructorVerification {
  status: "approved" | "rejected";
}

export interface IAdminUserFilter {
  role?: "student" | "instructor" | "admin";
  status?: "active" | "suspended";
  isVerified?: boolean;
}
