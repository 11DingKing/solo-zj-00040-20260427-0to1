import mongoose, { Schema, Document } from "mongoose";
import { SwapRequestStatus } from "../config";

export interface ISwapRequest extends Document {
  requesterId: mongoose.Types.ObjectId;
  targetEmployeeId: mongoose.Types.ObjectId;

  requesterShiftId: mongoose.Types.ObjectId;
  targetShiftId: mongoose.Types.ObjectId;

  storeId: mongoose.Types.ObjectId;

  status: SwapRequestStatus;

  requesterNote?: string;
  targetEmployeeNote?: string;
  managerNote?: string;

  targetEmployeeApprovedAt?: Date;
  managerActionBy?: mongoose.Types.ObjectId;
  managerActionAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const SwapRequestSchema: Schema<ISwapRequest> = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    requesterShiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    targetShiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },

    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SwapRequestStatus),
      default: SwapRequestStatus.PENDING,
      index: true,
    },

    requesterNote: { type: String, trim: true },
    targetEmployeeNote: { type: String, trim: true },
    managerNote: { type: String, trim: true },

    targetEmployeeApprovedAt: { type: Date },
    managerActionBy: { type: Schema.Types.ObjectId, ref: "User" },
    managerActionAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

SwapRequestSchema.index({ requesterId: 1, createdAt: -1 });
SwapRequestSchema.index({ targetEmployeeId: 1, status: 1 });
SwapRequestSchema.index({ storeId: 1, status: 1 });

export const SwapRequest = mongoose.model<ISwapRequest>(
  "SwapRequest",
  SwapRequestSchema,
);
