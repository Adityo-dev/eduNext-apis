import type { NextFunction, Request, Response } from "express";
import AuthModel from "../auth/models/authModel.js";
import CourseModel from "../course/models/courseModel.js";
import { PaymentModel } from "../payment/models/payment.model.js";
import { WithdrawalModel } from "../payment/models/withdrawal.model.js";
import { ReviewModel } from "../review/models/reviewModel.js";
import { sendEmail } from "../utils/sendEmail.js";
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
        { fullName: { $regex: search, $options: "i" } },
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
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !["active", "suspended"].includes(status)) {
      res.status(400);
      throw new Error("Please provide a valid status (active or suspended)");
    }

    if (status === "suspended" && (!reason || reason.trim() === "")) {
      res.status(400);
      throw new Error("Please provide a reason for suspending the account");
    }

    // find user
    const user = await AuthModel.findById(id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.isSuspended = status === "suspended";

    await user.save();

    // Send email notification about account status change
    const isSuspended = status === "suspended";
    const emailSubject = isSuspended
      ? "EduNext - Account Suspended"
      : "EduNext - Account Reactivated";

    let emailHtml = `
      <div style="background-color: ${isSuspended ? "#FEF2F2" : "#F0FDF4"}; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid ${isSuspended ? "#FECACA" : "#BBF7D0"}; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 42px;">${isSuspended ? "🚫" : "✅"}</span>
          </div>

          <h2 style="color: ${isSuspended ? "#DC2626" : "#166534"}; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
            Account ${isSuspended ? "Suspended" : "Reactivated"}
          </h2>

          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Hello ${user.fullName || user.firstName},
          </p>
    `;

    if (isSuspended) {
      emailHtml += `
          <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
            We regret to inform you that your EduNext account has been <strong style="color: #DC2626;">suspended</strong> by the administration.
          </p>

          <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: 600;">Reason:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #7F1D1D;">${reason}</p>
          </div>

          <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
            During this period, you will not be able to log in or access platform services. If you believe this is a mistake, please contact our support team.
          </p>
      `;
    } else {
      emailHtml += `
          <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
            Great news! Your EduNext account has been <strong style="color: #166534;">reactivated</strong> by the administration. 🎉
          </p>

          <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
            You can now log in and continue using all platform features and services.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="https://edunext-six.vercel.app" 
               style="background-color: #166534; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 10px; display: inline-block; font-size: 15px;">
              Go to Dashboard →
            </a>
          </div>
      `;
    }

    emailHtml += `
          <div style="border-top: 1px solid #E2E8F0; margin-top: 28px; padding-top: 16px; text-align: center;">
            <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
              © ${new Date().getFullYear()} EduNext · Admin Team
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send account status email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: `User account has been ${status} successfully`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Pending Badge Requests (Admin View)
export const getPendingBadgeRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      role: "instructor",
      "badgeRequest.status": "pending",
    };

    const [instructors, total] = await Promise.all([
      AuthModel.find(filter)
        .sort({ "badgeRequest.requestedAt": 1 })
        .skip(skip)
        .limit(limitNum)
        .select("-password"),
      AuthModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Pending badge requests fetched successfully",
      data: {
        instructors,
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

// 5. Get Instructor Profile (Admin View)
export const getInstructorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const instructor = await AuthModel.findById(id);

    if (!instructor) {
      res.status(404);
      throw new Error("Instructor not found");
    }

    if (instructor.role !== "instructor") {
      res.status(400);
      throw new Error("This user is not an instructor");
    }

    res.status(200).json({
      success: true,
      message: "Instructor profile fetched successfully",
      data: instructor,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Approve or Reject an Instructor's Badge Request (Admin Only)
export const approveInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" | "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400);
      throw new Error("Please provide a valid action: 'approve' or 'reject'");
    }

    const instructor = await AuthModel.findById(id);

    if (!instructor) {
      res.status(404);
      throw new Error("Instructor not found");
    }

    if (instructor.role !== "instructor") {
      res.status(400);
      throw new Error("This user is not an instructor");
    }

    // Must have a pending badge request to act on
    if (
      !instructor.badgeRequest ||
      instructor.badgeRequest.status !== "pending"
    ) {
      res.status(400);
      throw new Error("This instructor does not have a pending badge request");
    }

    if (action === "approve") {
      // Grant the requested badge
      instructor.badge = instructor.badgeRequest.requestedBadge;
      instructor.badgeRequest.status = "approved";
    } else {
      // Reject — keep current badge, just update request status
      instructor.badgeRequest.status = "rejected";
    }

    await instructor.save();

    // Send email notification to instructor
    const isApproved = action === "approve";
    const statusText = isApproved ? "APPROVED" : "REJECTED";
    const badgeName = instructor.badgeRequest?.requestedBadge || "badge";
    const emailSubject = `EduNext - Your Badge Request Has Been ${statusText}`;

    let emailHtml = `
      <div style="background-color: ${isApproved ? "#F0FDF4" : "#FEF2F2"}; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid ${isApproved ? "#BBF7D0" : "#FECACA"}; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 42px;">${isApproved ? "🏅" : "📋"}</span>
          </div>

          <h2 style="color: ${isApproved ? "#166534" : "#DC2626"}; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
            Badge Request ${statusText}
          </h2>

          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Hello ${instructor.fullName || instructor.firstName},
          </p>

          <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
            Your request for the <strong style="color: ${isApproved ? "#166534" : "#DC2626"};">${badgeName.toUpperCase()}</strong> badge has been <strong>${statusText.toLowerCase()}</strong>.
          </p>
    `;

    if (isApproved) {
      emailHtml += `
          <div style="background-color: #F0FDF4; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #166534; font-weight: 600;">
              🎉 Congratulations! Your profile now displays the ${badgeName.toUpperCase()} badge.
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="https://edunext-six.vercel.app" 
               style="background-color: #166534; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 10px; display: inline-block; font-size: 15px;">
              View Your Profile →
            </a>
          </div>
      `;
    } else {
      emailHtml += `
          <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
            Unfortunately, your profile does not meet all the requirements for this badge at this time. Please update your profile and try again later.
          </p>
      `;
    }

    emailHtml += `
          <div style="border-top: 1px solid #E2E8F0; margin-top: 28px; padding-top: 16px; text-align: center;">
            <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
              © ${new Date().getFullYear()} EduNext · Admin Team
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: instructor.email,
        subject: `${isApproved ? "🏅" : "📋"} Badge Request ${statusText} — EduNext`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error(
        "Failed to send badge approval/rejection email:",
        emailError,
      );
    }

    res.status(200).json({
      success: true,
      message: `Instructor badge request has been ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: {
        _id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        badge: instructor.badge,
        badgeRequest: instructor.badgeRequest,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Cancel an Instructor's Badge (Admin Only)
export const cancelBadge = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;

    if (!cancelReason || cancelReason.trim() === "") {
      res.status(400);
      throw new Error("Please provide a reason for cancelling the badge");
    }

    const instructor = await AuthModel.findById(id);

    if (!instructor) {
      res.status(404);
      throw new Error("Instructor not found");
    }

    if (instructor.role !== "instructor") {
      res.status(400);
      throw new Error("This user is not an instructor");
    }

    if (instructor.badge === "none") {
      res.status(400);
      throw new Error(
        "This instructor does not have any active badge to cancel",
      );
    }

    const oldBadge = instructor.badge;

    // Remove the badge
    instructor.badge = "none";
    if (instructor.badgeRequest) {
      instructor.badgeRequest.status = "none";
      instructor.badgeRequest.requestedBadge = "none";
    }

    await instructor.save();

    // Send email notification to instructor
    const emailSubject = "⚠️ Badge Cancelled — EduNext";
    const emailHtml = `
      <div style="background-color: #FEF2F2; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #FECACA; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 42px;">⚠️</span>
          </div>

          <h2 style="color: #DC2626; text-align: center; margin: 0 0 8px 0; font-size: 22px;">
            Badge Cancelled
          </h2>

          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Hello ${instructor.fullName || instructor.firstName},
          </p>

          <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
            Your <strong style="color: #DC2626;">${oldBadge.toUpperCase()}</strong> badge on EduNext has been cancelled by the administration.
          </p>

          <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: 600;">Reason:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #7F1D1D;">${cancelReason}</p>
          </div>

          <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
            If you believe this is a mistake, please contact our support team for assistance.
          </p>

          <div style="border-top: 1px solid #FECACA; margin-top: 28px; padding-top: 16px; text-align: center;">
            <p style="font-size: 12px; color: #CBD5E1; margin: 0;">
              © ${new Date().getFullYear()} EduNext · Admin Team
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: instructor.email,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send badge cancellation email:", emailError);
    }

    res.status(200).json({
      success: true,
      message:
        "Instructor badge has been cancelled successfully, and notification sent.",
      data: {
        _id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        badge: instructor.badge,
        badgeRequest: instructor.badgeRequest,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 7. Permanently Delete a User
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
