import mongoose from "mongoose";
import { Salary, ISalary, Attendance, IAttendance, User } from "../models";
import { AttendanceStatus } from "../config";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cacheService } from "../config/redis";

export interface MonthlySalarySummary {
  employeeId: string;
  employeeName: string;
  hourlyRate: number;
  totalScheduledHours: number;
  totalActualHours: number;
  totalBasePay: number;
  totalDeductionAmount: number;
  totalNetPay: number;
}

export const salaryService = {
  async calculateMonthlySalary(
    storeId: string,
    year: number,
    month: number,
  ): Promise<{ success: boolean; message: string; salaries: ISalary[] }> {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const employees = await User.find({
      role: "employee",
      "employeeProfile.storeIds": new mongoose.Types.ObjectId(storeId),
    });

    const salaries: ISalary[] = [];

    for (const employee of employees) {
      if (!employee.employeeProfile) continue;

      const attendances = await Attendance.find({
        employeeId: employee._id,
        storeId: new mongoose.Types.ObjectId(storeId),
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: 1 });

      let totalScheduledHours = 0;
      let totalActualHours = 0;
      let totalBasePay = 0;
      let totalDeductionAmount = 0;
      const details: ISalary["details"] = [];

      for (const attendance of attendances) {
        const basePay =
          attendance.actualWorkingHours * employee.employeeProfile.hourlyRate;
        const netPay = basePay - attendance.calculatedDeductionAmount;

        totalScheduledHours += attendance.scheduledDurationHours;
        totalActualHours += attendance.actualWorkingHours;
        totalBasePay += basePay;
        totalDeductionAmount += attendance.calculatedDeductionAmount;

        details.push({
          attendanceId: attendance._id,
          date: attendance.date,
          scheduledHours: attendance.scheduledDurationHours,
          actualHours: attendance.actualWorkingHours,
          basePay,
          deductionAmount: attendance.calculatedDeductionAmount,
          netPay,
          status: attendance.status,
        });
      }

      const totalNetPay = totalBasePay - totalDeductionAmount;

      let salary = await Salary.findOne({
        employeeId: employee._id,
        storeId: new mongoose.Types.ObjectId(storeId),
        year,
        month,
      });

      if (!salary) {
        salary = await Salary.create({
          employeeId: employee._id,
          storeId: new mongoose.Types.ObjectId(storeId),
          year,
          month,
          hourlyRate: employee.employeeProfile.hourlyRate,
          totalScheduledHours,
          totalActualHours,
          totalBasePay,
          totalDeductionAmount,
          totalNetPay,
          details,
          isCalculated: true,
          calculatedAt: new Date(),
        });
      } else {
        salary.hourlyRate = employee.employeeProfile.hourlyRate;
        salary.totalScheduledHours = totalScheduledHours;
        salary.totalActualHours = totalActualHours;
        salary.totalBasePay = totalBasePay;
        salary.totalDeductionAmount = totalDeductionAmount;
        salary.totalNetPay = totalNetPay;
        salary.details = details;
        salary.isCalculated = true;
        salary.calculatedAt = new Date();
        await salary.save();
      }

      const populatedSalary = await Salary.findById(salary._id).populate(
        "employeeId",
        "name phone avatar",
      );

      if (populatedSalary) {
        salaries.push(populatedSalary);
      }
    }

    await cacheService.deletePattern(`salary:${storeId}:${year}:${month}:*`);

    return {
      success: true,
      message: `已计算 ${salaries.length} 名员工的薪资`,
      salaries,
    };
  },

  async getMonthlySalaries(
    storeId: string,
    year: number,
    month: number,
  ): Promise<{ success: boolean; message: string; salaries: ISalary[] }> {
    const cacheKey = `salary:${storeId}:${year}:${month}:list`;
    const cached = await cacheService.get<ISalary[]>(cacheKey);

    if (cached) {
      return {
        success: true,
        message: "获取成功",
        salaries: cached,
      };
    }

    const salaries = await Salary.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      year,
      month,
    })
      .populate("employeeId", "name phone avatar")
      .sort({ "employeeId.name": 1 });

    if (salaries.length === 0) {
      const result = await this.calculateMonthlySalary(storeId, year, month);
      return result;
    }

    await cacheService.set(cacheKey, salaries, 3600);

    return {
      success: true,
      message: "获取成功",
      salaries,
    };
  },

  async getEmployeeSalary(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<{ success: boolean; message: string; salary?: ISalary }> {
    const salary = await Salary.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      year,
      month,
    })
      .populate("employeeId", "name phone avatar")
      .populate("storeId", "name address");

    if (!salary) {
      return {
        success: false,
        message: "薪资记录不存在",
      };
    }

    return {
      success: true,
      message: "获取成功",
      salary,
    };
  },

  async exportToCSV(
    storeId: string,
    year: number,
    month: number,
  ): Promise<string> {
    const result = await this.getMonthlySalaries(storeId, year, month);
    if (!result.success) {
      throw new Error(result.message);
    }

    const headers = [
      "员工姓名",
      "时薪",
      "计划工时",
      "实际工时",
      "基本工资",
      "扣款金额",
      "实发工资",
    ];
    const rows: string[] = [headers.join(",")];

    for (const salary of result.salaries) {
      const emp = salary.employeeId as unknown as { name: string };
      const row = [
        emp.name,
        salary.hourlyRate.toFixed(2),
        salary.totalScheduledHours.toFixed(2),
        salary.totalActualHours.toFixed(2),
        salary.totalBasePay.toFixed(2),
        salary.totalDeductionAmount.toFixed(2),
        salary.totalNetPay.toFixed(2),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  },
};
