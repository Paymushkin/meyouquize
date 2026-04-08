import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./env.js";
import {
  adminAuthSchema,
  createRoomSchema,
  patchQuestionProjectorSchema,
  replaceRoomContentSchema,
  updateRoomSchema,
} from "./schemas.js";
import { isAdminTokenValid } from "./admin-session-cache.js";
import { registerSocketHandlers } from "./socket/register-handlers.js";
import { attachSocketIoRedisAdapter } from "./socket/redis-io-adapter.js";
import { prisma } from "./prisma.js";
import { randomToken } from "./utils.js";
import {
  createRoom,
  getQuizBySlug,
  getQuizPublicState,
  getResults,
  getRoomByEventName,
  listRooms,
  getStandaloneVoteAdminDetail,
  getSubQuizDetailedResults,
  patchQuestionProjectorSettings,
  replaceRoomContent,
  updateRoomTitle,
} from "./quiz-service.js";

const ADMIN_COOKIE = "mq_admin";

async function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies[ADMIN_COOKIE];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const session = await prisma.adminSession.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

export function buildApp() {
  const app = express();
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, env.clientOrigins.includes(origin));
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    return res.json({ service: "meyouquize-backend", status: "ok" });
  });

  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again in 60 seconds." },
  });

  app.post("/api/admin/auth", authLimiter, async (req, res) => {
    const parsed = adminAuthSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    if (parsed.data.login !== env.adminLogin || parsed.data.password !== env.adminPassword) {
      return res.status(401).json({ error: "Wrong credentials" });
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env.adminSessionHours * 60 * 60 * 1000);
    await prisma.adminSession.create({
      data: { token, expiresAt },
    });
    res.cookie(ADMIN_COOKIE, token, {
      sameSite: "lax",
      httpOnly: true,
      secure: false,
      expires: expiresAt,
    });
    return res.json({ ok: true });
  });

  app.get("/api/admin/me", adminAuthMiddleware, (_req, res) => {
    return res.json({ ok: true });
  });

  app.get("/api/admin/rooms", adminAuthMiddleware, async (_req, res) => {
    const rooms = await listRooms();
    return res.json(rooms);
  });

  app.post("/api/admin/rooms", adminAuthMiddleware, async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const room = await createRoom(parsed.data);
      return res.status(201).json(room);
    } catch (error) {
      return res.status(409).json({ error: error instanceof Error ? error.message : "Room already exists" });
    }
  });

  app.get("/api/admin/rooms/:eventName", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
    const room = await getRoomByEventName(eventName);
    if (!room) return res.status(404).json({ error: "Not found" });
    return res.json(room);
  });

  app.patch("/api/admin/rooms/:eventName", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const room = await updateRoomTitle(eventName, parsed.data.title);
      return res.json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Not found";
      return res.status(message === "Room title already exists" ? 409 : 404).json({ error: message });
    }
  });

  app.put("/api/admin/rooms/:eventName/questions", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
    const parsed = replaceRoomContentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const room = await replaceRoomContent(eventName, parsed.data);
      return res.json(room);
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
    }
  });

  app.patch(
    "/api/admin/rooms/:eventName/questions/:questionId/projector-settings",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
      const questionId = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
      const parsed = patchQuestionProjectorSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      try {
        await patchQuestionProjectorSettings(eventName, questionId, parsed.data);
        return res.status(204).end();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Not found";
        const code = message === "Room not found" || message === "Question not found" ? 404 : 500;
        return res.status(code).json({ error: message });
      }
    },
  );

  app.get(
    "/api/admin/rooms/:eventName/votes/:questionId/detail",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
      const questionId = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
      const detail = await getStandaloneVoteAdminDetail(eventName, questionId);
      if (!detail) return res.status(404).json({ error: "Not found" });
      return res.json(detail);
    },
  );

  app.get(
    "/api/admin/rooms/:eventName/sub-quizzes/:subQuizId/results",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName) ? req.params.eventName[0] : req.params.eventName;
      const subQuizId = Array.isArray(req.params.subQuizId) ? req.params.subQuizId[0] : req.params.subQuizId;
      const payload = await getSubQuizDetailedResults(eventName, subQuizId);
      if (!payload) return res.status(404).json({ error: "Not found" });
      return res.json(payload);
    },
  );

  app.get("/api/quiz/:quizId/state", async (req, res) => {
    const quizId = Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId;
    const state = await getQuizPublicState(quizId);
    if (!state) return res.status(404).json({ error: "Not found" });
    return res.json(state);
  });

  app.get("/api/quiz/:quizId/results", async (req, res) => {
    const quizId = Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId;
    const results = await getResults(quizId);
    return res.json(results);
  });

  app.get("/api/quiz/by-slug/:slug/results", async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) return res.status(404).json({ error: "Not found" });
    const results = await getResults(quiz.id);
    return res.json(results);
  });

  app.get("/api/quiz/by-slug/:slug/meta", async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) return res.status(404).json({ error: "Not found" });
    return res.json({
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      status: quiz.status,
    });
  });

  app.get("/api/admin/quiz/:quizId/results", adminAuthMiddleware, async (req, res) => {
    const quizId = Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId;
    const results = await getResults(quizId);
    return res.json(results);
  });

  return app;
}

export async function buildServer() {
  const app = buildApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: true,
    },
  });
  io.use(async (socket, next) => {
    const cookie = socket.handshake.headers.cookie ?? "";
    const token = cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${ADMIN_COOKIE}=`))
      ?.split("=")[1];
    if (token) {
      if (await isAdminTokenValid(token)) {
        socket.data.isAdmin = true;
      }
    }
    next();
  });
  if (env.redisUrl) {
    try {
      await attachSocketIoRedisAdapter(io, env.redisUrl);
      console.info("[server] Redis: Socket.IO cluster adapter enabled");
    } catch (err) {
      console.error("[server] Redis init failed, continuing without cluster adapter", err);
    }
  }
  registerSocketHandlers(io);
  return { app, io, httpServer };
}
