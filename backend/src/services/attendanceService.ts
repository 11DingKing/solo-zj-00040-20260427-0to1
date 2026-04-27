import mongoose from "mongoose";
import { Attendance, IAttendance, Shift, IShift, User } from "../models";
import {
  AttendanceStatus,
  ShiftStatus,
  CLOCK_IN_ALLOWANCE_MINUTES,
  LATE_DEDUCTION_THRESHOLD_MINUTES,
} from "../config";
import { parse, format, addMinutes, differenceInMinutes } from "date-fns";

export interface ClockInInput {
  shiftId: string;
  employeeId: string;
  actualClockIn: Date;
}

export interface ClockOutInput {
  shiftId: string;
  employeeId: string;
  actualClockOut: Date;
}

export const attendanceService = {
  async clockIn(
    input: ClockInInput,
  ): Promise<{ success: boolean; message: string; attendance?: IAttendance }> {
    const { shiftId, employeeId, actualClockIn } = input;

    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return {
        success: false,
        message: "班次不存在",
      };
    }

    if (shift.employeeId.toString() !== employeeId) {
      return {
        success: false,
        message: "这不是你的班次",
      };
    }

    if (shift.status !== ShiftStatus.CONFIRMED) {
      return {
        success: false,
        message: "班次未确认，无法打卡",
      };
    }

    const shiftDate = shift.date;
    const scheduledStartTime = parse(
      `${format(shiftDate, "yyyy-MM-dd")} ${shift.startTime}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );

    const earliestAllowedTime = addMinutes(
      scheduledStartTime,
      -CLOCK_IN_ALLOWANCE_MINUTES,
    );
    const latestAllowedTime = addMinutes(
      scheduledStartTime,
      CLOCK_IN_ALLOWANCE_MINUTES,
    );

    if (actualClockIn < earliestAllowedTime) {
      return {
        success: false,
        message: "还未到打卡时间",
      };
    }

    let attendance = await Attendance.findOne({
      shiftId: new mongoose.Types.ObjectId(shiftId),
    });

    if (!attendance) {
      attendance = await Attendance.create({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        storeId: shift.storeId,
        shiftId: new mongoose.Types.ObjectId(shiftId),
        date: shift.date,
        scheduledStartTime: shift.startTime,
        scheduledEndTime: shift.endTime,
        scheduledDurationHours: shift.durationHours,
        status: AttendanceStatus.ABSENT,
        actualClockIn,
        clockInMinutesLate: Math.max(
          0,
          differenceInMinutes(actualClockIn, scheduledStartTime),
        ),
        calculatedDeductionAmount: 0,
      });
    } else {
      if (attendance.actualClockIn) {
        return {
          success: false,
          message: "已打卡签到",
          attendance,
        };
      }
      attendance.actualClockIn = actualClockIn;
      attendance.clockInMinutesLate = Math.max(
        0,
        differenceInMinutes(actualClockIn, scheduledStartTime),
      );
      await attendance.save();
    }

    attendance = await this.updateAttendanceStatus(attendance);

    return {
      success: true,
      message: "签到成功",
      attendance,
    };
  },

  async clockOut(
    input: ClockOutInput,
  ): Promise<{ success: boolean; message: string; attendance?: IAttendance }> {
    const { shiftId, employeeId, actualClockOut } = input;

    const attendance = await Attendance.findOne({
      shiftId: new mongoose.Types.ObjectId(shiftId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
    });

    if (!attendance) {
      return {
        success: false,
        message: "未找到考勤记录，请先签到",
      };
    }

    if (!attendance.actualClockIn) {
      return {
        success: false,
        message: "未签到，无法签退",
      };
    }

    if (attendance.actualClockOut) {
      return {
        success: false,
        message: "已打卡签退",
        attendance,
      };
    }

    const shiftDate = attendance.date;
    const scheduledEndTime = parse(
      `${format(shiftDate, "yyyy-MM-dd")} ${attendance.scheduledEndTime}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );

    attendance.actualClockOut = actualClockOut;
    attendance.clockOutMinutesEarly = Math.max(
      0,
      differenceInMinutes(scheduledEndTime, actualClockOut),
    );

    const actualWorkingMinutes = differenceInMinutes(
      actualClockOut,
      attendance.actualClockIn,
    );
    attendance.actualWorkingMinutes = Math.max(0, actualWorkingMinutes);
    attendance.actualWorkingHours = actualWorkingMinutes / 60;

    attendance = await this.updateAttendanceStatus(attendance);
    attendance = await this.calculateDeduction(attendance);

    return {
      success: true,
      message: "签退成功",
      attendance,
    };
  },

  async updateAttendanceStatus(attendance: IAttendance): Promise<IAttendance> {
    const isLate = attendance.clockInMinutesLate > 0;
    const isEarlyLeave = attendance.clockOutMinutesEarly > 0;
    const hasClockIn = !!attendance.actualClockIn;
    const hasClockOut = !!attendance.actualClockOut;

    if (!hasClockIn && !hasClockOut) {
      attendance.status = AttendanceStatus.ABSENT;
    } else if (isLate && isEarlyLeave) {
      attendance.status = AttendanceStatus.BOTH_LATE_AND_EARLY;
    } else if (isLate) {
      attendance.status = AttendanceStatus.LATE;
    } else if (isEarlyLeave) {
      attendance.status = AttendanceStatus.EARLY_LEAVE;
    } else {
      attendance.status = AttendanceStatus.ON_TIME;
    }

    await attendance.save();
    return attendance;
  },

  async calculateDeduction(attendance: IAttendance): Promise<IAttendance> {
    const employee = await User.findById(attendance.employeeId);
    if (!employee || !employee.employeeProfile) {
      return attendance;
    }

    const hourlyRate = employee.employeeProfile.hourlyRate;
    let deductionAmount = 0;

    if (attendance.status === AttendanceStatus.ABSENT) {
      deductionAmount = attendance.scheduledDurationHours * hourlyRate;
    } else {
      if (attendance.clockInMinutesLate >= LATE_DEDUCTION_THRESHOLD_MINUTES) {
        deductionAmount += hourlyRate * 0.5;
      }
    }

    attendance.calculatedDeductionAmount = deductionAmount;
    await attendance.save();

    return attendance;
  },

  async getByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    success: boolean;
    message: string;
    attendances: IAttendance[];
  }> {
    const query: Record<string, unknown> = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
    };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendances = await Attendance.find(query)
      .populate("storeId", "name address")
      .populate("shiftId")
      .sort({ date: -1 });

    return {
      success: true,
      message: "获取成功",
      attendances,
    };
  },

  async getByStore(
    storeId: string,
    startDate?: Date,
    endDate?: Date,
    employeeId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    attendances: IAttendance[];
  }> {
    const query: Record<string, unknown> = {
      storeId: new mongoose.Types.ObjectId(storeId),
    };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (employeeId) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    const attendances = await Attendance.find(query)
      .populate("employeeId", "name phone avatar")
      .populate("shiftId")
      .sort({ date: -1, employeeId: 1 });

    return {
      success: true,
      message: "获取成功",
      attendances,
    };
  },

  async createAttendanceForShift(shift: IShift): Promise<IAttendance> {
    const existingAttendance = await Attendance.findOne({ shiftId: shift._id });
    if (existingAttendance) {
      return existingAttendance;
    }

    return Attendance.create({
      employeeId: shift.employeeId,
      storeId: shift.storeId,
      shiftId: shift._id,
      date: shift.date,
      scheduledStartTime: shift.startTime,
      scheduledEndTime: shift.endTime,
      scheduledDurationHours: shift.durationHours,
      status: AttendanceStatus.ABSENT,
      clockInMinutesLate: 0,
      clockOutMinutesEarly: 0,
      actualWorkingMinutes: 0,
      actualWorkingHours: 0,
      calculatedDeductionAmount: 0,
    });
  },

  async markAbsentForPastShifts(): Promise<number> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const shifts = await Shift.find({
      date: { $lt: today },
      status: ShiftStatus.CONFIRMED,
    });

    let markedCount = 0;

    for (const shift of shifts) {
      const attendance = await Attendance.findOne({ shiftId: shift._id });
      if (!attendance) {
        await this.createAttendanceForShift(shift);
        markedCount++;
      } else if (!attendance.actualClockIn) {
        attendance.status = AttendanceStatus.ABSENT;
        await this.calculateDeduction(attendance);
        markedCount++;
      }
    }

    return markedCount;
  },
};
