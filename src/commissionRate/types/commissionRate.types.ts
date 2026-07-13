import { Document, Types } from "mongoose";

export interface ICommissionHistory {
  oldRate: number;
  newRate: number;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface IGlobalSetting extends Document {
  commissionRate: number;
  changeHistory: ICommissionHistory[];
  createdAt: Date;
  updatedAt: Date;
}
