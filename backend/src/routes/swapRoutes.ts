import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole, SwapRequestStatus } from "../config";
import { swapService, CreateSwapRequestInput } from "../services";

const swap = new Hono();

swap.use("*", authMiddleware);

swap.post("/", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json<CreateSwapRequestInput>();

    if (body.requesterId !== currentUser.id) {
      return c.json({ success: false, message: "只能为自己申请换班" }, 400);
    }

    const result = await swapService.create(body);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error("Create swap request error:", error);
    return c.json({ success: false, message: "创建换班申请失败" }, 500);
  }
});

swap.get("/sent", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const status = c.req.query("status") as SwapRequestStatus | undefined;

    const result = await swapService.getByRequester(currentUser.id, status);
    return c.json(result);
  } catch (error) {
    console.error("Get sent swap requests error:", error);
    return c.json({ success: false, message: "获取换班申请失败" }, 500);
  }
});

swap.get("/received", roleMiddleware(UserRole.EMPLOYEE), async (c) => {
  try {
    const currentUser = c.get("user");
    const status = c.req.query("status") as SwapRequestStatus | undefined;

    const result = await swapService.getByTargetEmployee(
      currentUser.id,
      status,
    );
    return c.json(result);
  } catch (error) {
    console.error("Get received swap requests error:", error);
    return c.json({ success: false, message: "获取换班申请失败" }, 500);
  }
});

swap.get(
  "/store/:storeId",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const storeId = c.req.param("storeId");
      const status = c.req.query("status") as SwapRequestStatus | undefined;

      const result = await swapService.getByStore(storeId, status);
      return c.json(result);
    } catch (error) {
      console.error("Get store swap requests error:", error);
      return c.json({ success: false, message: "获取换班申请失败" }, 500);
    }
  },
);

swap.post(
  "/:id/approve-target",
  roleMiddleware(UserRole.EMPLOYEE),
  async (c) => {
    try {
      const currentUser = c.get("user");
      const requestId = c.req.param("id");
      const body = await c.req.json<{ approve: boolean; note?: string }>();

      const result = await swapService.targetEmployeeApprove(
        requestId,
        currentUser.id,
        body.approve,
        body.note,
      );

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Approve swap request error:", error);
      return c.json({ success: false, message: "处理换班申请失败" }, 500);
    }
  },
);

swap.post(
  "/:id/approve-manager",
  roleMiddleware(UserRole.ADMIN, UserRole.MANAGER),
  async (c) => {
    try {
      const currentUser = c.get("user");
      const requestId = c.req.param("id");
      const body = await c.req.json<{ approve: boolean; note?: string }>();

      const result = await swapService.managerApprove(
        requestId,
        currentUser.id,
        body.approve,
        body.note,
      );

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result);
    } catch (error) {
      console.error("Manager approve swap request error:", error);
      return c.json({ success: false, message: "审批换班申请失败" }, 500);
    }
  },
);

export { swap };
