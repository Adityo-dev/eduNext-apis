import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import AuthModel from "./authModel.js";

// JWT Secret Key ->
const JWT_SECRET = config.jwtSecret || "edunext_secret_key_2026";

// Generate JWT Token Function ->
const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

// Signup ->
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      areaOfExpertise,
    } = req.body;

    // Validation ->
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return next(createHttpError(400, "All fields are required"));
    }

    // instructor must provide area of expertise
    if (role === "instructor") {
      if (
        !areaOfExpertise ||
        !Array.isArray(areaOfExpertise) ||
        areaOfExpertise.length === 0
      ) {
        return next(
          createHttpError(
            400,
            "Instructors must provide at least one area of expertise",
          ),
        );
      }
    }

    // Check if user already exists with the same email
    const userEmailExists = await AuthModel.findOne({ email });
    if (userEmailExists) {
      return next(createHttpError(400, "User already exists with this email"));
    }
    // Check if user already exists with the same phone number
    const userPhoneExists = await AuthModel.findOne({ phone });
    if (userPhoneExists) {
      return next(
        createHttpError(400, "User already exists with this phone number "),
      );
    }

    // Password Hashing ->
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create New User ->
    const newUser = await AuthModel.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: role || "student",
      areaOfExpertise,
    });

    // Generate JWT Token ->
    const token = generateToken(newUser._id as unknown as string, newUser.role);

    // Send Signup Success Response ->
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        areaOfExpertise: newUser.areaOfExpertise,
        password: newUser.password,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login ->
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email, password } = req.body;

  // Validation ->
  if (!email || !password) {
    return next(createHttpError(400, "Please provide email and password"));
  }

  // Check if user exists
  const userEmailExists = await AuthModel.findOne({ email });
  if (!userEmailExists) {
    return next(
      createHttpError(
        401,
        "This email is not registered. Please sign up first",
      ),
    );
  }

  // Check if user password and email match
  const user = await AuthModel.findOne({ email }).select("+password");
  if (!user) {
    return next(createHttpError(401, "Invalid email or password"));
  }

  // Generate JWT Token ->
  const token = generateToken(user._id as unknown as string, user.role);

  // Send Login Success Response ->
  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
      areaOfExpertise: user.areaOfExpertise,
    },
  });
};
