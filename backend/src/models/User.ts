import mongoose, { Schema, Document } from "mongoose";
import { UserRole, EmploymentType } from "../config";

export interface IAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
}

export interface IUser extends Document {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  email?: string;
  avatar?: string;

  employeeProfile?: {
    employmentType: EmploymentType;
    hourlyRate: number;
    storeIds: mongoose.Types.ObjectId[];
    skillTags: string[];
    availability: IAvailabilitySlot[];
    weeklyHoursLimit: number;
  };

  managerProfile?: {
    storeIds: mongoose.Types.ObjectId[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySlotSchema: Schema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isUnavailable: { type: Boolean, default: false },
  },
  { _id: false },
);

const EmployeeProfileSchema: Schema = new Schema(
  {
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      required: true,
    },
    hourlyRate: { type: Number, required: true, min: 0 },
    storeIds: [{ type: Schema.Types.ObjectId, ref: "Store", required: true }],
    skillTags: [{ type: String }],
    availability: { type: [AvailabilitySlotSchema], default: [] },
    weeklyHoursLimit: { type: Number, required: true },
  },
  { _id: false },
);

const ManagerProfileSchema: Schema = new Schema(
  {
    storeIds: [{ type: Schema.Types.ObjectId, ref: "Store", required: true }],
  },
  { _id: false },
);

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.EMPLOYEE,
    },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String },
    employeeProfile: { type: EmployeeProfileSchema },
    managerProfile: { type: ManagerProfileSchema },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ "employeeProfile.storeIds": 1 });
UserSchema.index({ "managerProfile.storeIds": 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
