import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Category from "../../models/categoryModel.js";

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return next(createHttpError(404, "Category not found"));
    }

    res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
