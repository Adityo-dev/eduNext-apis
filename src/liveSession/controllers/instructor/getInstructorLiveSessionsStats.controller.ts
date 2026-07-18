import type { NextFunction, Request, Response } from "express";
import LiveSessionModel from "../../models/liveSessionModel.js";

// ─── 2. GET INSTRUCTOR LIVE SESSIONS STATS
export const getInstructorLiveSessionsStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;

    const [liveNow, upcoming, completed] = await Promise.all([
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "live",
      }),
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "upcoming",
      }),
      LiveSessionModel.countDocuments({
        instructor: instructorId,
        status: "completed",
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Instructor live session stats fetched successfully",
      data: {
        liveNow,
        upcoming,
        completed,
      },
    });
  } catch (error) {
    next(error);
  }
};
