import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import { storeService, CreateStoreInput, UpdateStoreInput } from "../services";

const store = new Hono();

store.use("*", authMiddleware);

store.get("/", roleMiddleware(UserRole.ADMIN, UserRole.MANAGER), async (c) => {
  try {
    const includeInactive = c.req.query("includeInactive") === "true";
    const result = await storeService.getAll(includeInactive);
    return c.json(result);
  } catch (error) {
    console.error("Get stores error:", error);
    return c.json({ success: false, message: "获取门店列表失败" }, 500);
  }
});

store.get(
  "/:id",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const id = c.req.param("id");
      const result = await storeService.getById(id);

      if (!result.success) {
        return c.json(result, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Get store error:", error);
      return c.json({ success: false, message: "获取门店信息失败" }, 500);
    }
  },
);

store.post("/", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const body = await c.req.json<CreateStoreInput>();
    const result = await storeService.create(body);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error("Create store error:", error);
    return c.json({ success: false, message: "创建门店失败" }, 500);
  }
});

store.put("/:id", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateStoreInput>();
    const result = await storeService.update(id, body);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Update store error:", error);
    return c.json({ success: false, message: "更新门店失败" }, 500);
  }
});

store.delete("/:id", roleMiddleware(UserRole.ADMIN), async (c) => {
  try {
    const id = c.req.param("id");
    const result = await storeService.delete(id);

    if (!result.success) {
      return c.json(result, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error("Delete store error:", error);
    return c.json({ success: false, message: "删除门店失败" }, 500);
  }
});

store.post(
  "/:storeId/managers/:managerId",
  roleMiddleware(UserRole.ADMIN),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const managerId = c.req.param("managerId");
      const result = await storeService.addManager(storeId, managerId);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Add manager error:", error);
      return c.json({ success: false, message: "添加管理员失败" }, 500);
    }
  },
);

store.delete(
  "/:storeId/managers/:managerId",
  roleMiddleware(UserRole.ADMIN),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const managerId = c.req.param("managerId");
      const result = await storeService.removeManager(storeId, managerId);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Remove manager error:", error);
      return c.json({ success: false, message: "移除管理员失败" }, 500);
    }
  },
);

store.post(
  "/:storeId/employees/:employeeId",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const employeeId = c.req.param("employeeId");
      const result = await storeService.addEmployee(storeId, employeeId);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Add employee error:", error);
      return c.json({ success: false, message: "添加员工失败" }, 500);
    }
  },
);

store.delete(
  "/:storeId/employees/:employeeId",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const employeeId = c.req.param("employeeId");
      const result = await storeService.removeEmployee(storeId, employeeId);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Remove employee error:", error);
      return c.json({ success: false, message: "移除员工失败" }, 500);
    }
  },
);

export { store };
