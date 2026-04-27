import mongoose, { Schema, Document } from "mongoose";
import { AttendanceStatus } from "../config";

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;

  date: Date;

  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledDurationHours: number;

  actualClockIn?: Date;
  actualClockOut?: Date;

  clockInMinutesLate: number;
  clockOutMinutesEarly: number;
  actualWorkingMinutes: number;
  actualWorkingHours: number;

  status: AttendanceStatus;

  notes?: string;
  calculatedDeductionAmount: number;

  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
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
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
      unique: true,
      index: true,
    },

    date: { type: Date, required: true, index: true },

    scheduledStartTime: { type: String, required: true },
    scheduledEndTime: { type: String, required: true },
    scheduledDurationHours: { type: Number, required: true },

    actualClockIn: { type: Date },
    actualClockOut: { type: Date },

    clockInMinutesLate: { type: Number, default: 0 },
    clockOutMinutesEarly: { type: Number, default: 0 },
    actualWorkingMinutes: { type: Number, default: 0 },
    actualWorkingHours: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.ABSENT,
      index: true,
    },

    notes: { type: String, trim: true },
    calculatedDeductionAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

AttendanceSchema.index({ employeeId: 1, date: 1 });
AttendanceSchema.index({ storeId: 1, date: 1 });
AttendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema,
);
