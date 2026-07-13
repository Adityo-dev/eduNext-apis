import { Schema, model } from "mongoose";
import type {
  ICommissionHistory,
  IGlobalSetting,
} from "../types/commissionRate.types.js";

const historySchema = new Schema<ICommissionHistory>({
  oldRate: { type: Number, required: true },
  newRate: { type: Number, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedAt: { type: Date, default: Date.now },
});

const globalSettingSchema = new Schema<IGlobalSetting>(
  {
    commissionRate: {
      type: Number,
      required: true,
      default: 20,
      min: 5,
      max: 50,
    },
    changeHistory: [historySchema],
  },
  { timestamps: true },
);

export const GlobalSettingModel = model<IGlobalSetting>(
  "GlobalSetting",
  globalSettingSchema,
);
