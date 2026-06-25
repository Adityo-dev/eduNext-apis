import type { NextFunction, Request, Response } from "express";
import AuthModel from "../auth/authModel.js";

// 1.Get User Management Stats
export const getUserManagementStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [totalUsers, totalStudents, totalInstructors, totalSuspended] =
      await Promise.all([
        AuthModel.countDocuments(),
        AuthModel.countDocuments({ role: "student" }),
        AuthModel.countDocuments({ role: "instructor" }),
        AuthModel.countDocuments({ isSuspended: true }),
      ]);

    res.status(200).json({
      success: true,
      message: "User management stats fetched successfully",
      data: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalSuspended,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get all users with optional filters, search & pagination (Get All Users)
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      role,
      status,
      isVerified,
      search,
      page = "1",
      limit = "10",
    } = req.query;

    // Build filter
    const filter: any = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";

    // status: "active" | "suspended"
    if (status === "suspended") filter.isSuspended = true;
    if (status === "active") filter.isSuspended = false;

    // Search by name or email
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      AuthModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      AuthModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: {
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update User Status / Suspend & Activate User
export const updateUserStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["active", "suspended"].includes(status)) {
    res.status(400);
    throw new Error("Please provide a valid status (active or suspended)");
  }

  // find user
  const user = await AuthModel.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isSuspended = status === "suspended";

  await user.save();

  res.status(200).json({
    success: true,
    message: `User account has been ${status} successfully`,
    data: user,
  });
};

// 4.  (Instructor Verification)
export const verifyInstructor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error(
      "Please provide a valid verification status (approved or rejected)",
    );
  }

  const instructor = await AuthModel.findById(id);
  if (!instructor) {
    res.status(404);
    throw new Error("Instructor profile not found");
  }

  if (instructor.role !== "instructor") {
    res.status(400);
    throw new Error("This user is not an instructor");
  }

  instructor.isVerified = status === "approved";
  await instructor.save();

  res.status(200).json({
    success: true,
    message: `Instructor status has been updated to ${status}`,
    data: instructor,
  });
};

// 5. Permanently Delete a User
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
