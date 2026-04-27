import mongoose, { Schema, Document } from "mongoose";
import { ShiftStatus } from "../config";

export interface IShift extends Document {
  employeeId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;

  weekStartDate: Date;
  dayOfWeek: number;
  date: Date;

  startTime: string;
  endTime: string;
  durationHours: number;

  status: ShiftStatus;

  notes?: string;
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema: Schema<IShift> = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    weekStartDate: { type: Date, required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6, index: true },
    date: { type: Date, required: true, index: true },

    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationHours: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(ShiftStatus),
      default: ShiftStatus.DRAFT,
      index: true,
    },

    notes: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ShiftSchema.index({ employeeId: 1, date: 1 });
ShiftSchema.index({ storeId: 1, weekStartDate: 1 });
ShiftSchema.index({ employeeId: 1, weekStartDate: 1 });

export const Shift = mongoose.model<IShift>("Shift", ShiftSchema);
