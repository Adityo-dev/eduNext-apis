import type { NextFunction, Request, Response } from "express";
import LiveSessionModel from "../../models/liveSessionModel.js";

// ─── 2. Get All Live Sessions For Instructor Dashboard
export const getInstructorDashboardLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const instructorId = (req as any).user?._id || (req as any).user?.id;
    const { status } = req.query;

    const query: any = { instructor: instructorId };

    if (status && status !== "all") {
      query.status = status;
    }

    const sessions = await LiveSessionModel.find(query)
      .sort({ startTime: 1 })
      .populate("course", "title");

    // Sessions Join Counter
    const sessionsWithJoinCount = sessions.map((session) => {
      const totalUsersRegistered = session.joinedStudents
        ? session.joinedStudents.length
        : 0;
      return {
        ...session.toObject(),
        totalUsersRegistered,
      };
    });

    res.status(200).json({
      success: true,
      message: "Instructor dashboard live sessions fetched successfully",
      data: sessionsWithJoinCount,
    });
  } catch (error) {
    next(error);
  }
};
