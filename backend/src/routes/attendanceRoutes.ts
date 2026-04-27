import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import { attendanceService, ClockInInput, ClockOutInput } from "../services";
import { parse, startOfDay, endOfDay } from "date-fns";

const attendance = new Hono();

attendance.use("*", authMiddleware);

attendance.post("/clock-in", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json<{ shiftId: string; clientTime: string }>();

    const actualClockIn = new Date(body.clientTime);

    const result = await attendanceService.clockIn({
      shiftId: body.shiftId,
      employeeId: currentUser.id,
      actualClockIn,
    });

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Clock in error:", error);
    return c.json({ success: false, message: "签到失败" }, 500);
  }
});

attendance.post("/clock-out", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json<{ shiftId: string; clientTime: string }>();

    const actualClockOut = new Date(body.clientTime);

    const result = await attendanceService.clockOut({
      shiftId: body.shiftId,
      employeeId: currentUser.id,
      actualClockOut,
    });

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Clock out error:", error);
    return c.json({ success: false, message: "签退失败" }, 500);
  }
});

attendance.get("/my", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const startDateStr = c.req.query("startDate");
    const endDateStr = c.req.query("endDate");

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr && endDateStr) {
      startDate = parse(startDateStr, "yyyy-MM-dd", new Date());
      endDate = parse(endDateStr, "yyyy-MM-dd", new Date());
      endDate = endOfDay(endDate);
    }

    const result = await attendanceService.getByEmployee(
      currentUser.id,
      startDate,
      endDate,
    );
    return c.json(result);
  } catch (error) {
    console.error("Get my attendances error:", error);
    return c.json({ success: false, message: "获取考勤记录失败" }, 500);
  }
});

attendance.get(
  "/store/:storeId",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const startDateStr = c.req.query("startDate");
      const endDateStr = c.req.query("endDate");
      const employeeId = c.req.query("employeeId");

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startDateStr && endDateStr) {
        startDate = parse(startDateStr, "yyyy-MM-dd", new Date());
        endDate = parse(endDateStr, "yyyy-MM-dd", new Date());
        endDate = endOfDay(endDate);
      }

      const result = await attendanceService.getByStore(
        storeId,
        startDate,
        endDate,
        employeeId,
      );
      return c.json(result);
    } catch (error) {
      console.error("Get store attendances error:", error);
      return c.json({ success: false, message: "获取考勤记录失败" }, 500);
    }
  },
);

export { attendance };
