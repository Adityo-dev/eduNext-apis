import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Category from "../../models/categoryModel.js";

export const getSubcategoriesByCategoryId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    
    // Check if parent category exists
    const parentCategory = await Category.findById(id);
    if (!parentCategory) {
      return next(createHttpError(404, "Main category not found"));
    }

    const subCategories = await Category.find({ parentId: id, isActive: true }).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully",
      data: subCategories,
    });
  } catch (error) {
    next(error);
  }
};
