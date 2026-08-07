import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Category from "../../models/categoryModel.js";

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description, image, parentId, order } = req.body;

    if (!name) {
      return next(createHttpError(400, "Category name is required"));
    }

    const slug = name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return next(createHttpError(400, "Category already exists"));
    }

    const newCategory = await Category.create({
      name,
      slug,
      description,
      image,
      parentId: parentId || null,
      order: order !== undefined ? order : 0,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};
