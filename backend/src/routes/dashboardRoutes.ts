import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import { dashboardService } from "../services";
import { User, IUser } from "../models";
import { parse } from "date-fns";

const dashboard = new Hono();

dashboard.use("*", authMiddleware);

dashboard.get(
  "/",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const currentUser = c.get("user");
      const targetDateStr = c.req.query("targetDate");

      let storeIds: string[] | undefined;
      let targetDate: Date | undefined;

      if (targetDateStr) {
        targetDate = parse(targetDateStr, "yyyy-MM-dd", new Date());
      }

      if (currentUser.role === UserRole.MANAGER) {
        const user = await User.findById(currentUser.id);
        if (user && user.managerProfile) {
          storeIds = user.managerProfile.storeIds.map((id) => id.toString());
        }
      }

      const result = await dashboardService.getDashboardData(
        storeIds,
        targetDate,
      );
      return c.json(result);
    } catch (error) {
      console.error("Get dashboard data error:", error);
      return c.json({ success: false, message: "获取统计数据失败" }, 500);
    }
  },
);

dashboard.get("/employee", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const user = await User.findById(currentUser.id).populate(
      "employeeProfile.storeIds",
      "name address",
    );

    if (!user || !user.employeeProfile) {
      return c.json({ success: false, message: "用户信息不完整" }, 400);
    }

    const storeIds = user.employeeProfile.storeIds.map((id) => id.toString());
    const result = await dashboardService.getDashboardData(storeIds);

    return c.json(result);
  } catch (error) {
    console.error("Get employee dashboard error:", error);
    return c.json({ success: false, message: "获取统计数据失败" }, 500);
  }
});

export { dashboard };
