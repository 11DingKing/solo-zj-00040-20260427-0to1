import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import {
  userService,
  UpdateEmployeeProfileInput,
  UpdateManagerProfileInput,
} from "../services";

const user = new Hono();

user.use("*", authMiddleware);

user.get(
  "/employees",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.query("storeId");
      const search = c.req.query("search");
      const result = await userService.getAllEmployees(storeId, search);
      return c.json(result);
    } catch (error) {
      console.error("Get employees error:", error);
      return c.json({ success: false, message: "获取员工列表失败" }, 500);
    }
  },
);

user.get("/managers", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const storeId = c.req.query("storeId");
    const search = c.req.query("search");
    const result = await userService.getAllManagers(storeId, search);
    return c.json(result);
  } catch (error) {
    console.error("Get managers error:", error);
    return c.json({ success: false, message: "获取管理员列表失败" }, 500);
  }
});

user.get(
  "/:id",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const id = c.req.param("id");
      const result = await userService.getById(id);

      if (!result.success) {
        return c.json(result, 404);
      }

      if (result.user) {
        const userData = result.user.toObject();
        delete userData.password;
        return c.json({ ...result, user: userData });
      }

      return c.json(result);
    } catch (error) {
      console.error("Get user error:", error);
      return c.json({ success: false, message: "获取用户信息失败" }, 500);
    }
  },
);

user.put(
  "/employees/:id",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json<UpdateEmployeeProfileInput>();
      const currentUser = c.get("user");
      const isAdmin = currentUser.role === UserRole.ADMIN;

      const result = await userService.updateEmployeeProfile(id, body, isAdmin);

      if (!result.success) {
        return c.json(result, 400);
      }

      if (result.user) {
        const userData = result.user.toObject();
        delete userData.password;
        return c.json({ ...result, user: userData });
      }

      return c.json(result);
    } catch (error) {
      console.error("Update employee error:", error);
      return c.json({ success: false, message: "更新员工信息失败" }, 500);
    }
  },
);

user.put("/managers/:id", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateManagerProfileInput>();

    const result = await userService.updateManagerProfile(id, body, true);

    if (!result.success) {
      return c.json(result, 400);
    }

    if (result.user) {
      const userData = result.user.toObject();
      delete userData.password;
      return c.json({ ...result, user: userData });
    }

    return c.json(result);
  } catch (error) {
    console.error("Update manager error:", error);
    return c.json({ success: false, message: "更新管理员信息失败" }, 500);
  }
});

user.delete("/:id", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const id = c.req.param("id");
    const result = await userService.deleteUser(id);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Delete user error:", error);
    return c.json({ success: false, message: "删除用户失败" }, 500);
  }
});

user.put("/availability", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json<{ availability: unknown[] }>();

    const result = await userService.updateAvailability(
      currentUser.id,
      body.availability as any,
    );

    if (!result.success) {
      return c.json(result, 400);
    }

    if (result.user) {
      const userData = result.user.toObject();
      delete userData.password;
      return c.json({ ...result, user: userData });
    }

    return c.json(result);
  } catch (error) {
    console.error("Update availability error:", error);
    return c.json({ success: false, message: "更新可用时间失败" }, 500);
  }
});

user.get(
  "/store/:storeId/employees",
  roleMiddleware(UserRole.MANAGER, UserRole.ADMIN),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const result = await userService.getStoreEmployees(storeId);
      return c.json(result);
    } catch (error) {
      console.error("Get store employees error:", error);
      return c.json({ success: false, message: "获取门店员工失败" }, 500);
    }
  },
);

export { user };
