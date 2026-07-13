import type { Request, Response } from "express";
import { GlobalSettingModel } from "../models/commissionRate.model.js";

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

export const updateCommissionRate = async (req: Request, res: Response) => {
  try {
    const { newRate } = req.body;

    const adminId = req.user?.id;


    if (!newRate || newRate < 5 || newRate > 50) {
      return res.status(400).json({
        success: false,
        message: "Commission rate must be between 5% and 50%",
      });
    }

    let settings = await GlobalSettingModel.findOne();
    if (!settings) {
      settings = new GlobalSettingModel({
        commissionRate: 10,
        changeHistory: [],
      });
    }

    const oldRate = settings.commissionRate;

    if (oldRate === newRate) {
      return res.status(400).json({
        success: false,
        message: "New rate cannot be identical to the current rate",
      });
    }

    settings.changeHistory.unshift({
      oldRate,
      newRate,
      updatedBy: adminId,
      updatedAt: new Date(),
    });

    settings.commissionRate = newRate;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Commission rate updated and history logged successfully!",
      data: {
        currentRate: settings.commissionRate,
        changeHistory: settings.changeHistory,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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
