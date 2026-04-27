import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole, ShiftStatus } from "../config";
import { shiftService, CreateShiftInput, UpdateShiftInput } from "../services";
import { parse } from "date-fns";

const shift = new Hono();

shift.use("*", authMiddleware);

shift.get(
  "/store/:storeId/week/:weekStartDate",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const weekStartDateStr = c.req.param("weekStartDate");
      const status = c.req.query("status") as ShiftStatus | undefined;

      const weekStartDate = parse(weekStartDateStr, "yyyy-MM-dd", new Date());
      const result = await shiftService.getByStoreAndWeek(
        storeId,
        weekStartDate,
        status,
      );

      return c.json(result);
    } catch (error) {
      console.error("Get shifts by week error:", error);
      return c.json({ success: false, message: "获取排班失败" }, 500);
    }
  },
);

shift.get(
  "/employee/week/:weekStartDate",
  roleMiddleware(UserRole.EMPLOYEE),
  async (c) => {
    try {
      const currentUser = c.get("user");
      const weekStartDateStr = c.req.param("weekStartDate");

      const weekStartDate = parse(weekStartDateStr, "yyyy-MM-dd", new Date());
      const result = await shiftService.getByEmployeeAndWeek(
        currentUser.id,
        weekStartDate,
      );

      return c.json(result);
    } catch (error) {
      console.error("Get employee shifts error:", error);
      return c.json({ success: false, message: "获取排班失败" }, 500);
    }
  },
);

shift.post("/", roleMiddleware(UserRole.ADMIN, UserRole.MANAGER), async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json<
      CreateShiftInput & { checkConflict?: boolean }
    >();
    const checkConflict = body.checkConflict !== false;

    const result = await shiftService.create(
      {
        ...body,
        weekStartDate: new Date(body.weekStartDate),
        date: new Date(body.date),
        createdBy: currentUser.id,
      },
      checkConflict,
    );

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error("Create shift error:", error);
    return c.json({ success: false, message: "创建班次失败" }, 500);
  }
});

shift.post(
  "/validate",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const body = await c.req.json<{
        employeeId: string;
        storeId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        weekStartDate: string;
        excludeShiftId?: string;
      }>();

      const result = await shiftService.validateShift({
        employeeId: body.employeeId,
        storeId: body.storeId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        weekStartDate: parse(body.weekStartDate, "yyyy-MM-dd", new Date()),
        excludeShiftId: body.excludeShiftId,
      });

      return c.json({
        success: true,
        message: result.isValid ? "验证通过" : "存在冲突",
        isValid: result.isValid,
        conflicts: result.conflicts,
      });
    } catch (error) {
      console.error("Validate shift error:", error);
      return c.json({ success: false, message: "验证失败" }, 500);
    }
  },
);

shift.put(
  "/:id",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json<
        UpdateShiftInput & { checkConflict?: boolean }
      >();
      const checkConflict = body.checkConflict !== false;

      const result = await shiftService.update(id, body, checkConflict);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Update shift error:", error);
      return c.json({ success: false, message: "更新班次失败" }, 500);
    }
  },
);

shift.delete(
  "/:id",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const id = c.req.param("id");
      const result = await shiftService.delete(id);

      if (!result.success) {
        return c.json(result, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Delete shift error:", error);
      return c.json({ success: false, message: "删除班次失败" }, 500);
    }
  },
);

shift.post(
  "/store/:storeId/week/:weekStartDate/confirm",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const weekStartDateStr = c.req.param("weekStartDate");
      const weekStartDate = parse(weekStartDateStr, "yyyy-MM-dd", new Date());

      const result = await shiftService.confirmWeekShifts(
        storeId,
        weekStartDate,
      );

      return c.json(result);
    } catch (error) {
      console.error("Confirm shifts error:", error);
      return c.json({ success: false, message: "确认排班失败" }, 500);
    }
  },
);

shift.post(
  "/store/:storeId/week/:weekStartDate/automatic",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const weekStartDateStr = c.req.param("weekStartDate");
      const weekStartDate = parse(weekStartDateStr, "yyyy-MM-dd", new Date());

      const result = await shiftService.automaticScheduling(
        storeId,
        weekStartDate,
      );

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Automatic scheduling error:", error);
      return c.json({ success: false, message: "自动排班失败" }, 500);
    }
  },
);

shift.get(
  "/store/:storeId/week/:weekStartDate/conflicts",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const weekStartDateStr = c.req.param("weekStartDate");
      const weekStartDate = parse(weekStartDateStr, "yyyy-MM-dd", new Date());

      const result = await shiftService.checkShiftsForWeek(
        storeId,
        weekStartDate,
      );

      return c.json(result);
    } catch (error) {
      console.error("Check conflicts error:", error);
      return c.json({ success: false, message: "检查冲突失败" }, 500);
    }
  },
);

export { shift };
