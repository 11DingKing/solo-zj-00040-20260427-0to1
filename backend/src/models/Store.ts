import mongoose, { Schema, Document } from "mongoose";

export interface ITimeSlotRequirement {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minEmployees: number;
  maxEmployees: number;
}

export interface IStore extends Document {
  name: string;
  address: string;
  description?: string;

  businessHours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];

  timeSlotRequirements: ITimeSlotRequirement[];

  managerIds: mongoose.Types.ObjectId[];
  employeeIds: mongoose.Types.ObjectId[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const BusinessHoursSchema: Schema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    openTime: { type: String, required: true, default: "09:00" },
    closeTime: { type: String, required: true, default: "21:00" },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false },
);

const TimeSlotRequirementSchema: Schema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    minEmployees: { type: Number, required: true, min: 0, default: 1 },
    maxEmployees: { type: Number, required: true, min: 0, default: 5 },
  },
  { _id: false },
);

const StoreSchema: Schema<IStore> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    businessHours: {
      type: [BusinessHoursSchema],
      default: [
        {
          dayOfWeek: 0,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 1,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 2,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 3,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 4,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 5,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
        {
          dayOfWeek: 6,
          openTime: "09:00",
          closeTime: "21:00",
          isClosed: false,
        },
      ],
    },

    timeSlotRequirements: {
      type: [TimeSlotRequirementSchema],
      default: [],
    },

    managerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    employeeIds: [{ type: Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

StoreSchema.index({ name: 1 });
StoreSchema.index({ isActive: 1 });

export const Store = mongoose.model<IStore>("Store", StoreSchema);
