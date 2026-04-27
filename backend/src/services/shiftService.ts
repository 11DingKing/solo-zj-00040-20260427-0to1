import mongoose from "mongoose";
import { Shift, IShift, User, IUser, Store } from "../models";
import {
  ShiftStatus,
  EmploymentType,
  FULL_TIME_MAX_HOURS_PER_WEEK,
  PART_TIME_MAX_HOURS_PER_WEEK,
  MAX_CONTINUOUS_WORK_HOURS,
} from "../config";
import {
  calculateDurationHours,
  doDayTimeSlotsOverlap,
  getWeekStartDate,
  getDateFromWeekDay,
  timeToMinutes,
  minutesToTime,
} from "../utils";
import { cacheService } from "../config/redis";
import { IAvailabilitySlot } from "../models/User";
import { ITimeSlotRequirement } from "../models/Store";

export interface CreateShiftInput {
  employeeId: string;
  storeId: string;
  weekStartDate: Date;
  dayOfWeek: number;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateShiftInput {
  startTime?: string;
  endTime?: string;
  notes?: string;
  status?: ShiftStatus;
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

export interface ShiftValidationResult {
  isValid: boolean;
  conflicts: ShiftConflict[];
}

export const shiftService = {
  async create(
    input: CreateShiftInput,
    checkConflict: boolean = true,
  ): Promise<{
    success: boolean;
    message: string;
    shift?: IShift;
    conflicts?: ShiftConflict[];
  }> {
    const {
      employeeId,
      storeId,
      dayOfWeek,
      startTime,
      endTime,
      weekStartDate,
    } = input;

    const durationHours = calculateDurationHours(startTime, endTime);
    if (durationHours <= 0) {
      return {
        success: false,
        message: "班次时间无效",
      };
    }

    if (checkConflict) {
      const validation = await this.validateShift({
        employeeId,
        storeId,
        dayOfWeek,
        startTime,
        endTime,
        weekStartDate,
      });

      if (!validation.isValid) {
        return {
          success: false,
          message: "存在排班冲突",
          conflicts: validation.conflicts,
        };
      }
    }

    const date = getDateFromWeekDay(weekStartDate, dayOfWeek);

    const shift = await Shift.create({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      storeId: new mongoose.Types.ObjectId(storeId),
      weekStartDate,
      dayOfWeek,
      date,
      startTime,
      endTime,
      durationHours,
      status: ShiftStatus.DRAFT,
      notes: input.notes,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
    });

    await cacheService.deletePattern(`shift:${storeId}:*`);

    return {
      success: true,
      message: "班次创建成功",
      shift,
    };
  },

  async validateShift(input: {
    employeeId: string;
    storeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    weekStartDate: Date;
    excludeShiftId?: string;
  }): Promise<ShiftValidationResult> {
    const conflicts: ShiftConflict[] = [];
    const {
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
      weekStartDate,
      excludeShiftId,
    } = input;

    const employee = await User.findById(employeeId);
    if (!employee || !employee.employeeProfile) {
      return {
        isValid: false,
        conflicts: [],
      };
    }

    const query: Record<string, unknown> = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      weekStartDate,
    };

    if (excludeShiftId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeShiftId) };
    }

    const existingShifts = await Shift.find(query).populate(
      "employeeId",
      "name",
    );

    const newSlot = { dayOfWeek, startTime, endTime };

    for (const shift of existingShifts) {
      const existingSlot = {
        dayOfWeek: shift.dayOfWeek,
        startTime: shift.startTime,
        endTime: shift.endTime,
      };

      if (doDayTimeSlotsOverlap(newSlot, existingSlot)) {
        const emp = shift.employeeId as unknown as IUser;
        conflicts.push({
          shiftId: shift._id.toString(),
          employeeId: shift.employeeId.toString(),
          employeeName: emp.name,
          dayOfWeek: shift.dayOfWeek,
          startTime: shift.startTime,
          endTime: shift.endTime,
          conflictType: "overlap",
        });
      }
    }

    const weeklyHours = existingShifts.reduce(
      (total, shift) => total + shift.durationHours,
      0,
    );
    const newDuration = calculateDurationHours(startTime, endTime);
    const maxWeeklyHours =
      employee.employeeProfile.employmentType === EmploymentType.FULL_TIME
        ? FULL_TIME_MAX_HOURS_PER_WEEK
        : PART_TIME_MAX_HOURS_PER_WEEK;

    if (weeklyHours + newDuration > maxWeeklyHours) {
      conflicts.push({
        shiftId: "",
        employeeId,
        employeeName: employee.name,
        dayOfWeek,
        startTime,
        endTime,
        conflictType: "over_hours",
      });
    }

    const sameDayShifts = existingShifts.filter(
      (s) => s.dayOfWeek === dayOfWeek,
    );
    let continuousHours = 0;
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = timeToMinutes(endTime);

    for (const shift of sameDayShifts) {
      const shiftStart = timeToMinutes(shift.startTime);
      const shiftEnd = timeToMinutes(shift.endTime);

      if (newStartMinutes < shiftEnd && newEndMinutes > shiftStart) {
        continuousHours += shift.durationHours;
      }
    }

    if (continuousHours + newDuration > MAX_CONTINUOUS_WORK_HOURS) {
      conflicts.push({
        shiftId: "",
        employeeId,
        employeeName: employee.name,
        dayOfWeek,
        startTime,
        endTime,
        conflictType: "over_continuous",
      });
    }

    const availability = employee.employeeProfile.availability;
    const unavailableSlots = availability.filter(
      (slot) => slot.isUnavailable && slot.dayOfWeek === dayOfWeek,
    );

    for (const slot of unavailableSlots) {
      const unavailableSlot = {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };

      if (doDayTimeSlotsOverlap(newSlot, unavailableSlot)) {
        conflicts.push({
          shiftId: "",
          employeeId,
          employeeName: employee.name,
          dayOfWeek,
          startTime,
          endTime,
          conflictType: "unavailable",
        });
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  },

  async update(
    shiftId: string,
    input: UpdateShiftInput,
    checkConflict: boolean = true,
  ): Promise<{
    success: boolean;
    message: string;
    shift?: IShift;
    conflicts?: ShiftConflict[];
  }> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return {
        success: false,
        message: "班次不存在",
      };
    }

    if (checkConflict && (input.startTime || input.endTime)) {
      const validation = await this.validateShift({
        employeeId: shift.employeeId.toString(),
        storeId: shift.storeId.toString(),
        dayOfWeek: shift.dayOfWeek,
        startTime: input.startTime || shift.startTime,
        endTime: input.endTime || shift.endTime,
        weekStartDate: shift.weekStartDate,
        excludeShiftId: shiftId,
      });

      if (!validation.isValid) {
        return {
          success: false,
          message: "存在排班冲突",
          conflicts: validation.conflicts,
        };
      }
    }

    const updateData: Record<string, unknown> = { ...input };

    if (input.startTime || input.endTime) {
      const newStartTime = input.startTime || shift.startTime;
      const newEndTime = input.endTime || shift.endTime;
      updateData.durationHours = calculateDurationHours(
        newStartTime,
        newEndTime,
      );
    }

    const updatedShift = await Shift.findByIdAndUpdate(
      shiftId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    await cacheService.deletePattern(`shift:${shift.storeId}:*`);

    return {
      success: true,
      message: "班次更新成功",
      shift: updatedShift || undefined,
    };
  },

  async delete(
    shiftId: string,
  ): Promise<{ success: boolean; message: string }> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return {
        success: false,
        message: "班次不存在",
      };
    }

    await Shift.findByIdAndDelete(shiftId);

    await cacheService.deletePattern(`shift:${shift.storeId}:*`);

    return {
      success: true,
      message: "班次删除成功",
    };
  },

  async getByStoreAndWeek(
    storeId: string,
    weekStartDate: Date,
    status?: ShiftStatus,
  ): Promise<{ success: boolean; message: string; shifts: IShift[] }> {
    const cacheKey = `shift:${storeId}:${weekStartDate.toISOString()}:${status || "all"}`;
    const cached = await cacheService.get<IShift[]>(cacheKey);

    if (cached) {
      return {
        success: true,
        message: "获取成功",
        shifts: cached,
      };
    }

    const query: Record<string, unknown> = {
      storeId: new mongoose.Types.ObjectId(storeId),
      weekStartDate,
    };

    if (status) {
      query.status = status;
    }

    const shifts = await Shift.find(query)
      .populate("employeeId", "name phone avatar employeeProfile")
      .populate("createdBy", "name")
      .sort({ dayOfWeek: 1, startTime: 1 });

    await cacheService.set(cacheKey, shifts, 300);

    return {
      success: true,
      message: "获取成功",
      shifts,
    };
  },

  async getByEmployeeAndWeek(
    employeeId: string,
    weekStartDate: Date,
  ): Promise<{ success: boolean; message: string; shifts: IShift[] }> {
    const shifts = await Shift.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      weekStartDate,
      status: { $in: [ShiftStatus.CONFIRMED, ShiftStatus.COMPLETED] },
    })
      .populate("storeId", "name address")
      .populate("employeeId", "name")
      .sort({ dayOfWeek: 1, startTime: 1 });

    return {
      success: true,
      message: "获取成功",
      shifts,
    };
  },

  async confirmWeekShifts(
    storeId: string,
    weekStartDate: Date,
  ): Promise<{ success: boolean; message: string }> {
    const result = await Shift.updateMany(
      {
        storeId: new mongoose.Types.ObjectId(storeId),
        weekStartDate,
        status: ShiftStatus.DRAFT,
      },
      { $set: { status: ShiftStatus.CONFIRMED } },
    );

    await cacheService.deletePattern(`shift:${storeId}:*`);

    return {
      success: true,
      message: `已确认 ${result.modifiedCount} 个班次`,
    };
  },

  async automaticScheduling(
    storeId: string,
    weekStartDate: Date,
  ): Promise<{
    success: boolean;
    message: string;
    createdShifts?: IShift[];
    unmetRequirements?: ITimeSlotRequirement[];
  }> {
    const store = await Store.findById(storeId);
    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    const employees = await User.find({
      role: "employee",
      "employeeProfile.storeIds": new mongoose.Types.ObjectId(storeId),
    }).sort({ "employeeProfile.hourlyRate": 1 });

    if (employees.length === 0) {
      return {
        success: false,
        message: "门店没有可用员工",
      };
    }

    const existingShifts = await Shift.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      weekStartDate,
    });

    const employeeWeeklyHours: Record<string, number> = {};
    employees.forEach((emp) => {
      const hours = existingShifts
        .filter((s) => s.employeeId.toString() === emp._id.toString())
        .reduce((total, s) => total + s.durationHours, 0);
      employeeWeeklyHours[emp._id.toString()] = hours;
    });

    const createdShifts: IShift[] = [];
    const unmetRequirements: ITimeSlotRequirement[] = [];

    const requirements = store.timeSlotRequirements;
    if (requirements.length === 0) {
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const businessHours = store.businessHours.find(
          (h) => h.dayOfWeek === dayOfWeek,
        );
        if (!businessHours || businessHours.isClosed) continue;

        for (
          let hour = parseInt(businessHours.openTime.split(":")[0]);
          hour < parseInt(businessHours.closeTime.split(":")[0]);
          hour++
        ) {
          requirements.push({
            dayOfWeek,
            startTime: `${String(hour).padStart(2, "0")}:00`,
            endTime: `${String(hour + 1).padStart(2, "0")}:00`,
            minEmployees: 1,
            maxEmployees: 5,
          });
        }
      }
    }

    for (const req of requirements) {
      let assignedCount = 0;
      const existingInSlot = existingShifts.filter((shift) => {
        if (shift.dayOfWeek !== req.dayOfWeek) return false;
        const shiftStart = timeToMinutes(shift.startTime);
        const shiftEnd = timeToMinutes(shift.endTime);
        const reqStart = timeToMinutes(req.startTime);
        const reqEnd = timeToMinutes(req.endTime);
        return shiftStart < reqEnd && shiftEnd > reqStart;
      });

      assignedCount = existingInSlot.length;

      while (assignedCount < req.minEmployees) {
        let assigned = false;

        for (const employee of employees) {
          const empId = employee._id.toString();
          if (!employee.employeeProfile) continue;

          const maxHours =
            employee.employeeProfile.employmentType === EmploymentType.FULL_TIME
              ? FULL_TIME_MAX_HOURS_PER_WEEK
              : PART_TIME_MAX_HOURS_PER_WEEK;

          if ((employeeWeeklyHours[empId] || 0) + 1 > maxHours) continue;

          const availability = employee.employeeProfile.availability;
          const isUnavailable = availability.some(
            (slot) =>
              slot.isUnavailable &&
              slot.dayOfWeek === req.dayOfWeek &&
              doDayTimeSlotsOverlap(
                {
                  dayOfWeek: req.dayOfWeek,
                  startTime: req.startTime,
                  endTime: req.endTime,
                },
                slot,
              ),
          );

          if (isUnavailable) continue;

          const empExistingShifts = existingShifts.filter(
            (s) =>
              s.employeeId.toString() === empId &&
              s.dayOfWeek === req.dayOfWeek,
          );
          const hasConflict = empExistingShifts.some((shift) =>
            doDayTimeSlotsOverlap(
              {
                dayOfWeek: req.dayOfWeek,
                startTime: req.startTime,
                endTime: req.endTime,
              },
              {
                dayOfWeek: shift.dayOfWeek,
                startTime: shift.startTime,
                endTime: shift.endTime,
              },
            ),
          );

          if (hasConflict) continue;

          const date = getDateFromWeekDay(weekStartDate, req.dayOfWeek);

          const shift = await Shift.create({
            employeeId: new mongoose.Types.ObjectId(empId),
            storeId: new mongoose.Types.ObjectId(storeId),
            weekStartDate,
            dayOfWeek: req.dayOfWeek,
            date,
            startTime: req.startTime,
            endTime: req.endTime,
            durationHours: calculateDurationHours(req.startTime, req.endTime),
            status: ShiftStatus.DRAFT,
            createdBy: new mongoose.Types.ObjectId("000000000000000000000001"),
          });

          createdShifts.push(shift);
          employeeWeeklyHours[empId] =
            (employeeWeeklyHours[empId] || 0) + shift.durationHours;
          assignedCount++;
          assigned = true;
          break;
        }

        if (!assigned) {
          unmetRequirements.push(req);
          break;
        }
      }
    }

    await cacheService.deletePattern(`shift:${storeId}:*`);

    return {
      success: true,
      message: `自动排班完成，创建了 ${createdShifts.length} 个班次${unmetRequirements.length > 0 ? `，有 ${unmetRequirements.length} 个时段未满足需求` : ""}`,
      createdShifts,
      unmetRequirements:
        unmetRequirements.length > 0 ? unmetRequirements : undefined,
    };
  },

  async checkShiftsForWeek(
    storeId: string,
    weekStartDate: Date,
  ): Promise<{
    success: boolean;
    message: string;
    conflicts: ShiftConflict[];
  }> {
    const shifts = await Shift.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      weekStartDate,
    });

    const allConflicts: ShiftConflict[] = [];

    for (const shift of shifts) {
      const validation = await this.validateShift({
        employeeId: shift.employeeId.toString(),
        storeId: shift.storeId.toString(),
        dayOfWeek: shift.dayOfWeek,
        startTime: shift.startTime,
        endTime: shift.endTime,
        weekStartDate: shift.weekStartDate,
        excludeShiftId: shift._id.toString(),
      });

      if (!validation.isValid) {
        allConflicts.push(...validation.conflicts);
      }
    }

    return {
      success: true,
      message:
        allConflicts.length > 0
          ? `发现 ${allConflicts.length} 个冲突`
          : "无冲突",
      conflicts: allConflicts,
    };
  },
};
