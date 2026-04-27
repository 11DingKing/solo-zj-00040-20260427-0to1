import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { env } from "./config";
import { connectMongoDB } from "./config/mongodb";
import { connectRedis } from "./config/redis";
import { authService } from "./services";
import {
  auth,
  store,
  user,
  shift,
  swap,
  attendance,
  salary,
  dashboard,
} from "./routes";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({
    name: "智能排班调度系统 API",
    version: "1.0.0",
    status: "running",
  });
});

app.route("/api/auth", auth);
app.route("/api/stores", store);
app.route("/api/users", user);
app.route("/api/shifts", shift);
app.route("/api/swaps", swap);
app.route("/api/attendance", attendance);
app.route("/api/salary", salary);
app.route("/api/dashboard", dashboard);

app.onError((err, c) => {
  console.error("Application Error:", err);
  return c.json(
    {
      success: false,
      message: "服务器内部错误",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "路由不存在",
    },
    404,
  );
});

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();
    await authService.initAdmin();

    console.log(`\n========================================`);
    console.log(`🚀 智能排班调度系统 API 服务器已启动`);
    console.log(`📡 端口: ${env.port}`);
    console.log(`🌐 地址: http://localhost:${env.port}`);
    console.log(`========================================\n`);
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
};

serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    console.log(`服务器正在监听端口: ${info.port}`);
    startServer();
  },
);

export { app };
