import mongoose from "mongoose";
import { Shift, Attendance, Store, User, Salary, IShift } from "../models";
import { ShiftStatus, AttendanceStatus, UserRole } from "../config";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { cacheService } from "../config/redis";

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

export const dashboardService = {
  async getDashboardData(
    storeIds?: string[],
    targetDate?: Date,
  ): Promise<{ success: boolean; message: string; data: DashboardData }> {
    const date = targetDate || new Date();
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const cacheKey = `dashboard:${storeIds ? storeIds.join(",") : "all"}:${format(date, "yyyy-MM-dd")}`;
    const cached = await cacheService.get<DashboardData>(cacheKey);

    if (cached) {
      return {
        success: true,
        message: "获取成功",
        data: cached,
      };
    }

    let storeQuery: Record<string, unknown> = { isActive: true };
    if (storeIds && storeIds.length > 0) {
      storeQuery._id = {
        $in: storeIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const stores = await Store.find(storeQuery).sort({ name: 1 });
    const storeObjectIds = stores.map((s) => s._id);

    const weeklyCoverage = await this.calculateWeeklyCoverage(
      storeObjectIds,
      weekStart,
      weekEnd,
      stores,
    );

    const attendanceRate = await this.calculateAttendanceRate(
      storeObjectIds,
      weekStart,
      weekEnd,
      stores,
    );

    const monthlyLaborCost = await this.calculateMonthlyLaborCost(
      storeObjectIds,
      monthStart,
      monthEnd,
    );

    const storeHoursDistribution = await this.calculateStoreHoursDistribution(
      storeObjectIds,
      weekStart,
      weekEnd,
      stores,
    );

    const data: DashboardData = {
      weeklyCoverage,
      attendanceRate,
      monthlyLaborCost,
      storeHoursDistribution,
    };

    await cacheService.set(cacheKey, data, 1800);

    return {
      success: true,
      message: "获取成功",
      data,
    };
  },

  async calculateWeeklyCoverage(
    storeIds: mongoose.Types.ObjectId[],
    weekStart: Date,
    weekEnd: Date,
    stores: { _id: mongoose.Types.ObjectId; name: string }[],
  ): Promise<DashboardData["weeklyCoverage"]> {
    const shifts = await Shift.find({
      storeId: { $in: storeIds },
      weekStartDate: weekStart,
    });

    const coverageMap = new Map<
      string,
      { scheduled: number; confirmed: number }
    >();

    for (const shift of shifts) {
      const storeId = shift.storeId.toString();
      const current = coverageMap.get(storeId) || {
        scheduled: 0,
        confirmed: 0,
      };
      current.scheduled++;
      if (
        shift.status === ShiftStatus.CONFIRMED ||
        shift.status === ShiftStatus.COMPLETED
      ) {
        current.confirmed++;
      }
      coverageMap.set(storeId, current);
    }

    return stores.map((store) => {
      const data = coverageMap.get(store._id.toString()) || {
        scheduled: 0,
        confirmed: 0,
      };
      return {
        storeId: store._id.toString(),
        storeName: store.name,
        scheduledShifts: data.scheduled,
        confirmedShifts: data.confirmed,
        coverageRate:
          data.scheduled > 0 ? (data.confirmed / data.scheduled) * 100 : 0,
      };
    });
  },

  async calculateAttendanceRate(
    storeIds: mongoose.Types.ObjectId[],
    weekStart: Date,
    weekEnd: Date,
    stores: { _id: mongoose.Types.ObjectId; name: string }[],
  ): Promise<DashboardData["attendanceRate"]> {
    const attendances = await Attendance.find({
      storeId: { $in: storeIds },
      date: { $gte: weekStart, $lte: weekEnd },
    });

    const attendanceMap = new Map<
      string,
      { total: number; onTime: number; late: number; absent: number }
    >();

    for (const attendance of attendances) {
      const storeId = attendance.storeId.toString();
      const current = attendanceMap.get(storeId) || {
        total: 0,
        onTime: 0,
        late: 0,
        absent: 0,
      };
      current.total++;

      switch (attendance.status) {
        case AttendanceStatus.ON_TIME:
          current.onTime++;
          break;
        case AttendanceStatus.LATE:
        case AttendanceStatus.BOTH_LATE_AND_EARLY:
          current.late++;
          break;
        case AttendanceStatus.ABSENT:
          current.absent++;
          break;
      }

      attendanceMap.set(storeId, current);
    }

    return stores.map((store) => {
      const data = attendanceMap.get(store._id.toString()) || {
        total: 0,
        onTime: 0,
        late: 0,
        absent: 0,
      };
      return {
        storeId: store._id.toString(),
        storeName: store.name,
        totalShifts: data.total,
        onTime: data.onTime,
        late: data.late,
        absent: data.absent,
        attendanceRate:
          data.total > 0 ? ((data.onTime + data.late) / data.total) * 100 : 0,
      };
    });
  },

  async calculateMonthlyLaborCost(
    storeIds: mongoose.Types.ObjectId[],
    monthStart: Date,
    monthEnd: Date,
  ): Promise<DashboardData["monthlyLaborCost"]> {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth() + 1;

    const salaries = await Salary.find({
      storeId: { $in: storeIds },
      year,
      month,
    });

    let totalBasePay = 0;
    let totalDeduction = 0;
    let totalNetPay = 0;

    for (const salary of salaries) {
      totalBasePay += salary.totalBasePay;
      totalDeduction += salary.totalDeductionAmount;
      totalNetPay += salary.totalNetPay;
    }

    return {
      totalBasePay,
      totalDeduction,
      totalNetPay,
    };
  },

  async calculateStoreHoursDistribution(
    storeIds: mongoose.Types.ObjectId[],
    weekStart: Date,
    weekEnd: Date,
    stores: { _id: mongoose.Types.ObjectId; name: string }[],
  ): Promise<DashboardData["storeHoursDistribution"]> {
    const shifts = await Shift.find({
      storeId: { $in: storeIds },
      weekStartDate: weekStart,
      status: { $in: [ShiftStatus.CONFIRMED, ShiftStatus.COMPLETED] },
    });

    const hoursMap = new Map<string, number>();

    for (const shift of shifts) {
      const storeId = shift.storeId.toString();
      const current = hoursMap.get(storeId) || 0;
      hoursMap.set(storeId, current + shift.durationHours);
    }

    return stores.map((store) => ({
      storeId: store._id.toString(),
      storeName: store.name,
      totalHours: hoursMap.get(store._id.toString()) || 0,
    }));
  },
};
