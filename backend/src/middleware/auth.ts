import { createMiddleware } from "hono/factory";
import { UserRole } from "../config";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { User } from "../models";

declare module "hono" {
  interface ContextVariableMap {
    user: {
      id: string;
      phone: string;
      role: UserRole;
    };
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return c.json(
      {
        success: false,
        message: "未提供认证令牌",
      },
      401,
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json(
      {
        success: false,
        message: "令牌无效或已过期",
      },
      401,
    );
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    return c.json(
      {
        success: false,
        message: "用户不存在",
      },
      401,
    );
  }

  c.set("user", {
    id: payload.userId,
    phone: payload.phone,
    role: payload.role,
  });

  await next();
});

export const roleMiddleware = (...allowedRoles: UserRole[]) => {
  return createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          success: false,
          message: "未登录",
        },
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: "权限不足",
        },
        403,
      );
    }

    await next();
  });
};
