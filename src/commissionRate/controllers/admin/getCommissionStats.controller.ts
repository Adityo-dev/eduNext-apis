import type { Request, Response } from "express";
import { GlobalSettingModel } from "../../models/commissionRate.model.js";
import { PaymentModel } from "../../../payment/models/payment.model.js";

export const getCommissionStats = async (req: Request, res: Response) => {
  try {
    // Run both queries concurrently using Promise.all
    const [settings, paymentStats] = await Promise.all([
      GlobalSettingModel.findOne(),
      PaymentModel.aggregate([
        {
          $match: { status: "paid" },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            commissionEarned: { $sum: "$commissionAmount" },
          },
        },
      ]),
    ]);

    const currentRate = settings ? settings.commissionRate : 20;

    const stats =
      paymentStats.length > 0
        ? paymentStats[0]
        : { totalRevenue: 0, commissionEarned: 0 };

    return res.status(200).json({
      success: true,
      message: "Commission stats fetched successfully",
      data: {
        currentRate,
        commissionEarned: stats.commissionEarned,
        totalRevenue: stats.totalRevenue,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
