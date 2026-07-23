import type { NextFunction, Request, Response } from "express";
import Category from "../../models/categoryModel.js";

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { all, nested } = req.query;

    // Base filter
    const filter: any = all === "true" ? {} : { isActive: true };

    // If nested=true, only fetch main categories and populate their subCategories
    if (nested === "true") {
      filter.parentId = null;
    }

    let query = Category.find(filter).sort({ createdAt: -1 });

    if (nested === "true") {
      // populate virtual field 'subCategories'
      query = query.populate("subCategories");
    }

    const categories = await query;

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
