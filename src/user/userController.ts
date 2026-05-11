import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import Jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import userModel from "./userModel.js";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  // user validation
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required");
    return next(error);
  }

  // check if user already exists
  const user = await userModel.findOne({ email });

  // response
  if (user) {
    const error = createHttpError(400, "User With this email already exists");
    return next(error);
  }

  // Password Hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  // New User Creation
  const newUser = await userModel.create({
    name,
    email,
    password: hashedPassword,
  });

  // JWT Token Generation
  const token = Jwt.sign(
    {
      sub: newUser._id,
    },
    config.jwtSecret as string,
    {
      expiresIn: "7d",
    },
  );

  // Response
  return res.status(201).json({ message: newUser?._id, AccessToken: token });
};

export default createUser;
