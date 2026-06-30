import type { NextFunction, Response } from "express";
import createHttpError from "http-errors";
import AuthModel from "../models/authModel.js";

// Role base Dynamic Progress Bar Update
const computeProgress = (user: any): number => {
  if (user.role === "admin") return 100;

  let score = 20;
  if (user.avatar) score += 20;
  if (user.bio) score += 20;
  if (user.areaOfExpertise && user.areaOfExpertise.length > 0) score += 20;

  if (user.role === "instructor") {
    if (user.linkedinUrl) score += 7;
    if (user.coverPhoto) score += 7;
    if (user.experienceYears && user.experienceYears > 0) score += 6;
  } else if (user.role === "student") {
    if (user.linkedinUrl) score += 10;
    if (user.githubUrl) score += 10;
  }

  return Math.min(score, 100);
};

// Get My Profile
export const getProfile = async (
  req: any,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await AuthModel.findById(req.user?.id);
    if (!user) return next(createHttpError(404, "Profile not found."));

    const profileProgress = computeProgress(user);

    res.status(200).json({
      success: true,
      profileProgress: `${profileProgress}%`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update Profile (Secure & Role-Based)
export const updateProfile = async (
  req: any,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      firstName,
      lastName,
      phone,
      bio,
      skills,
      areaOfExpertise,
      experienceYears,
      linkedinUrl,
      githubUrl,
      avatar,
      coverPhoto,
    } = req.body;

    const user = await AuthModel.findById(userId);
    if (!user) return next(createHttpError(404, "User account not found."));

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    if (user.role !== "admin") {
      if (bio) user.bio = bio;
      if (linkedinUrl) user.linkedinUrl = linkedinUrl;
    }

    if (user.role === "student") {
      if (githubUrl) user.githubUrl = githubUrl;
      if (skills && Array.isArray(skills)) user.areaOfExpertise = skills;
    }

    if (user.role === "instructor") {
      if (coverPhoto) user.coverPhoto = coverPhoto;
      if (areaOfExpertise && Array.isArray(areaOfExpertise)) {
        user.areaOfExpertise = areaOfExpertise;
      }
      if (
        experienceYears !== undefined &&
        typeof experienceYears === "number"
      ) {
        user.experienceYears = experienceYears;
      }
    }

    await user.save();
    const updatedProgress = computeProgress(user);

    res.status(200).json({
      success: true,
      message: "Profile dashboard updated successfully.",
      profileProgress: `${updatedProgress}%`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Request Badge (Strictly Locked for Instructors Only)
export const requestBadge = async (
  req: any,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await AuthModel.findById(req.user?.id);
    if (!user) return next(createHttpError(404, "User details not found."));

    if (user.role !== "instructor") {
      return next(
        createHttpError(
          403,
          "Access denied. Only instructors can request professional badges.",
        ),
      );
    }

    const { targetBadge } = req.body;
    const currentBadge = user.badge || "none";

    const badgeTiers = ["none", "bronze", "silver", "blue"];
    const currentRank = badgeTiers.indexOf(currentBadge);
    const targetRank = badgeTiers.indexOf(targetBadge);

    if (targetRank === -1) {
      return next(createHttpError(400, "Invalid tier badge request type."));
    }

    if (targetRank <= currentRank) {
      return next(
        createHttpError(
          400,
          `You cannot apply for ${targetBadge.toUpperCase()} because you already have an equal or higher badge.`,
        ),
      );
    }

    if (user.badgeRequest?.status === "pending") {
      return next(
        createHttpError(
          400,
          "You already have a pending badge request. Please wait for admin approval.",
        ),
      );
    }

    const badgeRequirements: Record<string, number> = {
      bronze: 50,
      silver: 75,
      blue: 90,
    };
    const progress = computeProgress(user);
    const requiredMin = badgeRequirements[targetBadge];

    if (requiredMin !== undefined && progress < requiredMin) {
      return next(
        createHttpError(
          400,
          `Requires at least ${requiredMin}% profile completion for ${targetBadge.toUpperCase()} Tier.`,
        ),
      );
    }

    user.badgeRequest = {
      requestedBadge: targetBadge,
      status: "pending",
      requestedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: `Your application for ${targetBadge.toUpperCase()} tier badge has been queued for admin verification.`,
    });
  } catch (error) {
    next(error);
  }
};
