import type { Request, Response } from "express";
import AuthModel from "../auth/authModel.js";

// ১. Get all users with optional filters (Get All Users)
export const getAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { role, status, isVerified } = req.query;

  // Default filter
  const filter: any = {};
  if (role) filter.role = role;
  if (isVerified) filter.isVerified = isVerified === "true";

  // status: "active" | "suspended" কে ডেটাবেজের isSuspended বুলিয়ানের সাথে ম্যাপ করা হলো
  if (status) {
    if (status === "suspended") filter.isSuspended = true;
    if (status === "active") filter.isSuspended = false;
  }

  const users = await AuthModel.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
};

// Update User Status / Suspend & Activate User
export const updateUserStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'suspended'

  if (!status || !["active", "suspended"].includes(status)) {
    res.status(400);
    throw new Error("Please provide a valid status (active or suspended)");
  }

  // ১. প্রথমে ইউজারকে খুঁজে বের করুন
  const user = await AuthModel.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // ২. ডাইরেক্ট স্কিমার প্রপার্টিতে ভ্যালু সেট করুন
  user.isSuspended = status === "suspended";

  // ৩. ডাটাবেজে সেভ করুন (এতে স্কিমা ভ্যালিডেশন ১০০% কাজ করবে)
  await user.save();

  res.status(200).json({
    success: true,
    message: `User account has been ${status} successfully`,
    data: user,
  });
};

// ৩. নতুন শিক্ষকদের প্রোফাইল যাচাই করে অ্যাপ্রুভ বা রিজেক্ট করা (Instructor Verification)
export const verifyInstructor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' | 'rejected'

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error(
      "Please provide a valid verification status (approved or rejected)",
    );
  }

  // শিক্ষককে খুঁজে বের করা এবং তিনি আসলেই ইনস্ট্রাক্টর কিনা তা চেক করা
  const instructor = await AuthModel.findById(id);
  if (!instructor) {
    res.status(404);
    throw new Error("Instructor profile not found");
  }

  if (instructor.role !== "instructor") {
    res.status(400);
    throw new Error("This user is not an instructor");
  }

  // ভেরিফিকেশন স্ট্যাটাস এবং 'isVerified' আপডেট করা
  instructor.isVerified = status === "approved";
  await instructor.save();

  res.status(200).json({
    success: true,
    message: `Instructor status has been updated to ${status}`,
    data: instructor,
  });
};

// ৪. Permanently Delete a User
export const deleteUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const user = await AuthModel.findByIdAndDelete(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found to delete");
  }

  res.status(200).json({
    success: true,
    message: "User account has been permanently deleted from EduNext",
  });
};
