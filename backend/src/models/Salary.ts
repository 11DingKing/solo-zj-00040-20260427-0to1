import mongoose, { Schema, Document } from "mongoose";

export interface ISalaryDetail {
  attendanceId: mongoose.Types.ObjectId;
  date: Date;
  scheduledHours: number;
  actualHours: number;
  basePay: number;
  deductionAmount: number;
  netPay: number;
  status: string;
}

export interface ISalary extends Document {
  employeeId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;

  year: number;
  month: number;

  hourlyRate: number;

  totalScheduledHours: number;
  totalActualHours: number;

  totalBasePay: number;
  totalDeductionAmount: number;
  totalNetPay: number;

  details: ISalaryDetail[];

  isCalculated: boolean;
  calculatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const SalaryDetailSchema: Schema = new Schema(
  {
    attendanceId: {
      type: Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },
    date: { type: Date, required: true },
    scheduledHours: { type: Number, required: true, default: 0 },
    actualHours: { type: Number, required: true, default: 0 },
    basePay: { type: Number, required: true, default: 0 },
    deductionAmount: { type: Number, required: true, default: 0 },
    netPay: { type: Number, required: true, default: 0 },
    status: { type: String, required: true },
  },
  { _id: false },
);

const SalarySchema: Schema<ISalary> = new Schema(
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

    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },

    hourlyRate: { type: Number, required: true, default: 0 },

    totalScheduledHours: { type: Number, required: true, default: 0 },
    totalActualHours: { type: Number, required: true, default: 0 },

    totalBasePay: { type: Number, required: true, default: 0 },
    totalDeductionAmount: { type: Number, required: true, default: 0 },
    totalNetPay: { type: Number, required: true, default: 0 },

    details: { type: [SalaryDetailSchema], default: [] },

    isCalculated: { type: Boolean, default: false },
    calculatedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

SalarySchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });
SalarySchema.index({ storeId: 1, year: 1, month: 1 });

export const Salary = mongoose.model<ISalary>("Salary", SalarySchema);
