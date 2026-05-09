import type { NextFunction, Request, Response } from "express";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: "User registered successfully " });
  } catch (error) {
    next(error);
  }
};

export default createUser;
