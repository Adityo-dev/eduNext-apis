import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Category from "../../models/categoryModel.js";

export const reorderCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { categories } = req.body;

    // categories should be an array of objects: [{ id: "...", order: 1 }, { id: "...", order: 2 }]
    if (!Array.isArray(categories) || categories.length === 0) {
      return next(
        createHttpError(400, "Invalid or empty categories array provided"),
      );
    }

    const bulkOps = categories.map((cat: { id: string; order: number }) => ({
      updateOne: {
        filter: { _id: cat.id },
        update: { $set: { order: cat.order } },
      },
    }));

    await Category.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};
