import type { Request, Response } from "express";
import { GlobalSettingModel } from "../../models/commissionRate.model.js";

export const getCommissionRateForInstructor = async (req: Request, res: Response) => {
  try {
    const settings = await GlobalSettingModel.findOne().select("commissionRate -_id");
    
    const currentRate = settings ? settings.commissionRate : 20;

    return res.status(200).json({
      success: true,
      message: "Current platform commission rate fetched successfully",
      data: {
        commissionRate: currentRate
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
