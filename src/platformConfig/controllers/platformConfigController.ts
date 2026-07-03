import type { NextFunction, Request, Response } from "express";
import PlatformConfigModel from "../models/platformConfigModel.js";

// 1. Get Platform Configuration
export const getPlatformConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let config = await PlatformConfigModel.findOne();

    // If no config exists, create a default one
    if (!config) {
      config = await PlatformConfigModel.create({});
    }

    res.status(200).json({
      success: true,
      message: "Platform configuration fetched successfully",
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Update Platform Configuration (Admin Only)
export const updatePlatformConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updateData = req.body;

    // Use findOneAndUpdate with upsert: true to update or create
    const config = await PlatformConfigModel.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Platform configuration updated successfully",
      data: config,
    });
  } catch (error) {
    next(error);
  }
};
