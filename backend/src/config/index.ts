import { config } from "dotenv";

config();

export const env = {
  port: Number(process.env.PORT) || 3001,
  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://admin:admin123@localhost:27017/scheduling?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  jwtExpiresIn: "7d",
};

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  EMPLOYEE = "employee",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
}

export enum ShiftStatus {
  DRAFT = "draft",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
}

export enum SwapRequestStatus {
  PENDING = "pending",
  TARGET_APPROVED = "target_approved",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum AttendanceStatus {
  ON_TIME = "on_time",
  LATE = "late",
  EARLY_LEAVE = "early_leave",
  ABSENT = "absent",
  BOTH_LATE_AND_EARLY = "both_late_and_early",
}

export const FULL_TIME_MAX_HOURS_PER_WEEK = 40;
export const PART_TIME_MAX_HOURS_PER_WEEK = 20;
export const MAX_CONTINUOUS_WORK_HOURS = 6;
export const MIN_REST_HOURS_BETWEEN_SHIFTS = 12;
export const CLOCK_IN_ALLOWANCE_MINUTES = 15;
export const LATE_DEDUCTION_THRESHOLD_MINUTES = 30;
