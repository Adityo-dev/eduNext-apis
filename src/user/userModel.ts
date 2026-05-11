import mongoose from "mongoose";
import type { UserType } from "./userType.js";

const userSchema = new mongoose.Schema<UserType>(
  {
    name: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      unique: true,
      require: true,
    },
    password: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<UserType>("User", userSchema);
