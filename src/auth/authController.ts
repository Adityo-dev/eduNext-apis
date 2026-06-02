import type { Request, Response } from "express";
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
export const signup = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, phone, password, role } = req.body;

  // Validation ->
  if (!firstName || !lastName || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please fill out all fields");
  }

  // Check if user already exists with the same email
  const userEmailExists = await AuthModel.findOne({ email });
  if (userEmailExists) {
    res.status(400);
    throw new Error("User already exists with this email ");
  }
  // Check if user already exists with the same phone number
  const userPhoneExists = await AuthModel.findOne({ phone });
  if (userPhoneExists) {
    res.status(400);
    throw new Error("User already exists with this phone number ");
  }

  // Create New User ->
  const newUser = await AuthModel.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    role: role || "student",
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
      password: newUser.password,
    },
  });
};

// Login ->
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Validation ->
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // Check if user exists
  const userEmailExists = await AuthModel.findOne({ email });
  if (!userEmailExists) {
    res.status(401);
    throw new Error("This email is not registered. Please sign up first");
  }

  // Check if user password and email match
  const user = await AuthModel.findOne({ email }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
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
    },
  });
};
