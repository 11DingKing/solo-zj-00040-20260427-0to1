import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { UserRole } from "../config";
import { authService, RegisterInput, LoginInput } from "../services";

const auth = new Hono();

auth.post("/login", async (c) => {
  try {
    const body = await c.req.json<LoginInput>();
    const result = await authService.login(body);

    if (!result.success) {
      return c.json(result, 401);
    }

    return c.json(result);
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, message: "登录失败" }, 500);
  }
});

auth.post("/register", async (c) => {
  try {
    const body = await c.req.json<RegisterInput>();
    const result = await authService.register(body);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error("Register error:", error);
    return c.json({ success: false, message: "注册失败" }, 500);
  }
});

auth.get("/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const result = await authService.getCurrentUser(user.id);

    if (!result.success || !result.user) {
      return c.json(result, 404);
    }

    const userData = result.user.toObject();
    delete userData.password;

    return c.json({
      success: true,
      message: "获取成功",
      user: userData,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return c.json({ success: false, message: "获取用户信息失败" }, 500);
  }
});

auth.put("/password", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json<{
      oldPassword: string;
      newPassword: string;
    }>();

    const result = await authService.updatePassword(
      user.id,
      body.oldPassword,
      body.newPassword,
    );
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Update password error:", error);
    return c.json({ success: false, message: "更新密码失败" }, 500);
  }
});

auth.post("/init-admin", async (c) => {
  try {
    await authService.initAdmin();
    return c.json({ success: true, message: "管理员初始化完成" });
  } catch (error) {
    console.error("Init admin error:", error);
    return c.json({ success: false, message: "初始化管理员失败" }, 500);
  }
});

export { auth };
