import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Category from "../../models/categoryModel.js";

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive, parentId } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return next(createHttpError(404, "Category not found"));
    }

    if (name) {
      category.name = name;
      category.slug = name
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;
    if (parentId !== undefined) category.parentId = parentId || null;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
