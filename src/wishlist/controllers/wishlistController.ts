import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import CourseModel from "../../course/models/courseModel.js";
import { WishlistModel } from "../models/wishlistModel.js";

// ─── 1. Add to Wishlist
export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { courseId } = req.body;

    if (!courseId) {
      return next(createHttpError(400, "Course ID is required"));
    }

    const courseExists = await CourseModel.findById(courseId);
    if (!courseExists) {
      return next(createHttpError(404, "Course not found"));
    }

    const existingWishlist = await WishlistModel.findOne({
      user: userId,
      course: courseId,
    });

    if (existingWishlist) {
      res.status(200).json({
        success: true,
        message: "Course is already in your wishlist",
      });
      return;
    }

    await WishlistModel.create({
      user: userId,
      course: courseId,
    });

    res.status(201).json({
      success: true,
      message: "Course added to wishlist successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Remove from Wishlist
export const removeFromWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { courseId } = req.params;

    const deletedWishlist = await WishlistModel.findOneAndDelete({
      user: userId,
      course: courseId,
    });

    if (!deletedWishlist) {
      return next(createHttpError(404, "Course not found in wishlist"));
    }

    res.status(200).json({
      success: true,
      message: "Course removed from wishlist successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Get User's Wishlist
export const getUserWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [wishlists, total] = await Promise.all([
      WishlistModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "course",
          select:
            "title slug thumbnail price estimatedPrice category subCategory level language rating enrolledCount status instructor totalDuration hasCertificate",
          populate: {
            path: "instructor",
            select: "fullName avatar",
          },
        }),
      WishlistModel.countDocuments({ user: userId }),
    ]);

    // Filter out wishlists where course might have been deleted
    const validWishlists = wishlists.filter((w) => w.course !== null);

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: {
        wishlists: validWishlists,
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
