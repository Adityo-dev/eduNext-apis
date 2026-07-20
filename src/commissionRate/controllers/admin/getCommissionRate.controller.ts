import type { Request, Response } from "express";
import { GlobalSettingModel } from "../../models/commissionRate.model.js";

export const getCommissionRate = async (req: Request, res: Response) => {
  try {
    let settings = await GlobalSettingModel.findOne();

    if (!settings) {
      settings = new GlobalSettingModel({
        commissionRate: 10,
        changeHistory: [],
      });
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      message: "Commission rate fetched successfully",
      data: {
        commissionRate: settings.commissionRate,
        changeHistory: settings.changeHistory,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
