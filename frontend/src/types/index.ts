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

export interface IAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
}

export interface IUser {
  _id: string;
  name: string;
  phone: string;
  role: UserRole;
  email?: string;
  avatar?: string;
  employeeProfile?: {
    employmentType: EmploymentType;
    hourlyRate: number;
    storeIds: IStore[];
    skillTags: string[];
    availability: IAvailabilitySlot[];
    weeklyHoursLimit: number;
  };
  managerProfile?: {
    storeIds: IStore[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ITimeSlotRequirement {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minEmployees: number;
  maxEmployees: number;
}

export interface IStore {
  _id: string;
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
  managerIds: IUser[];
  employeeIds: IUser[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IShift {
  _id: string;
  employeeId: IUser;
  storeId: string;
  weekStartDate: string;
  dayOfWeek: number;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: ShiftStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftConflict {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  conflictType: "overlap" | "over_hours" | "over_continuous" | "unavailable";
}

export interface ISwapRequest {
  _id: string;
  requesterId: IUser;
  targetEmployeeId: IUser;
  requesterShiftId: IShift;
  targetShiftId: IShift;
  storeId: string;
  status: SwapRequestStatus;
  requesterNote?: string;
  targetEmployeeNote?: string;
  managerNote?: string;
  targetEmployeeApprovedAt?: string;
  managerActionBy?: IUser;
  managerActionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendance {
  _id: string;
  employeeId: IUser;
  storeId: IStore;
  shiftId: IShift;
  date: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledDurationHours: number;
  actualClockIn?: string;
  actualClockOut?: string;
  clockInMinutesLate: number;
  clockOutMinutesEarly: number;
  actualWorkingMinutes: number;
  actualWorkingHours: number;
  status: AttendanceStatus;
  notes?: string;
  calculatedDeductionAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ISalaryDetail {
  attendanceId: string;
  date: string;
  scheduledHours: number;
  actualHours: number;
  basePay: number;
  deductionAmount: number;
  netPay: number;
  status: string;
}

export interface ISalary {
  _id: string;
  employeeId: IUser;
  storeId: IStore;
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
  calculatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  weeklyCoverage: {
    storeId: string;
    storeName: string;
    scheduledShifts: number;
    confirmedShifts: number;
    coverageRate: number;
  }[];

  attendanceRate: {
    storeId: string;
    storeName: string;
    totalShifts: number;
    onTime: number;
    late: number;
    absent: number;
    attendanceRate: number;
  }[];

  monthlyLaborCost: {
    totalBasePay: number;
    totalDeduction: number;
    totalNetPay: number;
  };

  storeHoursDistribution: {
    storeId: string;
    storeName: string;
    totalHours: number;
  }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  user?: T;
  users?: T;
  employees?: T;
  managers?: T;
  stores?: T;
  shifts?: T;
  conflicts?: T;
  requests?: T;
  attendances?: T;
  salaries?: T;
  isValid?: boolean;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  email?: string;
  employeeProfile?: {
    employmentType: EmploymentType;
    hourlyRate: number;
    storeIds: string[];
    skillTags?: string[];
  };
  managerProfile?: {
    storeIds: string[];
  };
}
