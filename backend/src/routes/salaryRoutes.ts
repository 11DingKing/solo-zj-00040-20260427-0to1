import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import { salaryService } from "../services";

const salary = new Hono();

salary.use("*", authMiddleware);

salary.post(
  "/calculate/store/:storeId/:year/:month",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const year = parseInt(c.req.param("year"));
      const month = parseInt(c.req.param("month"));

      const result = await salaryService.calculateMonthlySalary(
        storeId,
        year,
        month,
      );
      return c.json(result);
    } catch (error) {
      console.error("Calculate salary error:", error);
      return c.json({ success: false, message: "计算薪资失败" }, 500);
    }
  },
);

salary.get(
  "/store/:storeId/:year/:month",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const year = parseInt(c.req.param("year"));
      const month = parseInt(c.req.param("month"));

      const result = await salaryService.getMonthlySalaries(
        storeId,
        year,
        month,
      );
      return c.json(result);
    } catch (error) {
      console.error("Get salaries error:", error);
      return c.json({ success: false, message: "获取薪资数据失败" }, 500);
    }
  },
);

salary.get("/my/:year/:month", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const year = parseInt(c.req.param("year"));
    const month = parseInt(c.req.param("month"));

    const result = await salaryService.getEmployeeSalary(
      currentUser.id,
      year,
      month,
    );

    if (!result.success) {
      return c.json(result, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error("Get my salary error:", error);
    return c.json({ success: false, message: "获取薪资数据失败" }, 500);
  }
});

salary.get(
  "/export/store/:storeId/:year/:month",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const year = parseInt(c.req.param("year"));
      const month = parseInt(c.req.param("month"));

      const csvContent = await salaryService.exportToCSV(storeId, year, month);

      c.header("Content-Type", "text/csv; charset=utf-8");
      c.header(
        "Content-Disposition",
        `attachment; filename="salary-${year}-${month}.csv"`,
      );

      return c.text(csvContent);
    } catch (error) {
      console.error("Export salary error:", error);
      return c.json({ success: false, message: "导出薪资数据失败" }, 500);
    }
  },
);

export { salary };
