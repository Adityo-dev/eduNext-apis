import type { NextFunction, Response } from "express";
import createHttpError from "http-errors";
import AuthModel from "../models/authModel.js";

const computeProgress = (user: any): number => {
  let score = 20;
  if (user.avatar) score += 20;
  if (user.bio) score += 20;
  if (user.skills && user.skills.length > 0) score += 20;
  if (user.linkedinUrl || user.githubUrl) score += 20;
  return score;
};

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
      linkedinUrl,
      githubUrl,
      avatar,
      coverPhoto,
      areaOfExpertise,
    } = req.body;

    const user = await AuthModel.findById(userId);
    if (!user) return next(createHttpError(404, "User account not found."));

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (coverPhoto) user.coverPhoto = coverPhoto;
    if (linkedinUrl) user.linkedinUrl = linkedinUrl;
    if (githubUrl) user.githubUrl = githubUrl;

    if (skills && Array.isArray(skills)) user.areaOfExpertise = skills;
    if (user.role === "instructor" && areaOfExpertise)
      user.areaOfExpertise = areaOfExpertise;

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

export const requestBadge = async (
  req: any,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await AuthModel.findById(req.user?.id);
    if (!user) return next(createHttpError(404, "User details not found."));

    const progress = computeProgress(user);
    const { targetBadge } = req.body;

    if (!["bronze", "silver", "blue"].includes(targetBadge)) {
      return next(createHttpError(400, "Invalid tier badge request type."));
    }

    if (targetBadge === "bronze" && progress < 50)
      return next(
        createHttpError(
          400,
          "Requires at least 50% profile completion for Bronze Tier.",
        ),
      );

    if (targetBadge === "silver" && progress < 75)
      return next(
        createHttpError(
          400,
          "Requires at least 75% profile completion for Silver Tier.",
        ),
      );

    if (targetBadge === "blue" && progress < 90)
      return next(
        createHttpError(
          400,
          "Requires at least 90% profile completion for Blue Verified Tier.",
        ),
      );

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
