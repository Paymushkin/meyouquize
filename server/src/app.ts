import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import multer from "multer";
import { adminCredentialMatch } from "./admin-accounts.js";
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
import { isPrivateNetworkViteDevPort } from "./cors-allow.js";
import { prisma } from "./prisma.js";
import { randomToken } from "./utils.js";
import { readFontLibrary, registerFont } from "./font-library.js";
import { publicViewJsonToState } from "./socket/public-view-store.js";
import {
  createRoom,
  getQuizBySlug,
  getPublicReportBySlug,
  getQuizPublicState,
  getResults,
  getRoomByEventName,
  listParticipantNicknamesByEventName,
  listRooms,
  getStandaloneVoteAdminDetail,
  getSubQuizDetailedResults,
  patchQuestionProjectorSettings,
  replaceRoomContent,
  updateRoomTitle,
} from "./quiz-service.js";
import { renderPublicReportPdf } from "./report-pdf.js";
import { resetDemoQuizToDefault } from "./demo-seed.js";

const ADMIN_COOKIE = "mq_admin";

type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

function apiError(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: message, code, details };
}

function isRequestHttps(req: express.Request): boolean {
  if (req.secure) return true;
  const proto = req.get("x-forwarded-proto");
  return typeof proto === "string" && proto.split(",")[0]?.trim() === "https";
}

function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (env.clientOrigins.includes(origin)) return true;
  if (env.networkMode === "lan" && origin === "null") return true;
  if (env.networkMode === "lan" && env.allowLanViteOrigins && isPrivateNetworkViteDevPort(origin)) {
    return true;
  }
  return false;
}

async function adminAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = req.cookies[ADMIN_COOKIE];
  if (!token) return res.status(401).json(apiError("UNAUTHORIZED", "Unauthorized"));
  const session = await prisma.adminSession.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) {
    return res.status(401).json(apiError("UNAUTHORIZED", "Unauthorized"));
  }
  return next();
}

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.networkMode === "internet") {
    app.set("trust proxy", 1);
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            fontSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
          },
        },
      }),
    );
  }
  fs.mkdirSync(env.mediaDir, { recursive: true });
  const mediaUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, env.mediaDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 8 ? ext : ".bin";
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });
  const fontUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, env.mediaDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 8 ? ext : ".bin";
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedExt = new Set([".woff2"]);
      const ext = path.extname(file.originalname || "").toLowerCase();
      const mime = (file.mimetype || "").toLowerCase();
      const looksLikeFont = mime.includes("woff2");
      if (allowedExt.has(ext) || looksLikeFont) cb(null, true);
      else cb(new Error("Only .woff2 font files are allowed"));
    },
  });
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed = isCorsOriginAllowed(origin ?? undefined);
        if (!allowed) {
          console.warn("[cors] reject origin", { origin, mode: env.networkMode });
        }
        callback(null, allowed);
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use("/media", express.static(env.mediaDir));

  app.get("/", (_req, res) => {
    return res.json({ service: "meyouquize-backend", status: "ok" });
  });

  app.get("/healthz", (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(503).json({ ok: false, error: "DB_NOT_READY" });
    }
  });

  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again in 60 seconds." },
  });
  const adminApiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many admin API requests. Please try again in a minute." },
  });

  app.post("/api/admin/auth", authLimiter, async (req, res) => {
    const parsed = adminAuthSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json(apiError("INVALID_PAYLOAD", "Invalid payload"));
    if (!adminCredentialMatch(env.adminAccounts, parsed.data.login, parsed.data.password)) {
      return res.status(401).json(apiError("WRONG_CREDENTIALS", "Wrong credentials"));
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env.adminSessionHours * 60 * 60 * 1000);
    await prisma.adminSession.create({
      data: { token, expiresAt },
    });
    const cookieSecure = env.networkMode === "internet" ? true : isRequestHttps(req);
    res.cookie(ADMIN_COOKIE, token, {
      sameSite: "lax",
      httpOnly: true,
      secure: cookieSecure,
      /** `/api/admin` не отправляется на `/socket.io` — handshake без сессии, assertAdmin падает. */
      path: "/",
      expires: expiresAt,
    });
    return res.json({ ok: true });
  });

  app.get("/api/admin/me", adminAuthMiddleware, (_req, res) => {
    return res.json({ ok: true });
  });
  app.use("/api/admin", adminApiLimiter);

  app.post("/api/admin/media/upload", adminAuthMiddleware, (req, res) => {
    mediaUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json(apiError("UPLOAD_FAILED", message));
      }
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      if (!file) return res.status(400).json(apiError("FILE_REQUIRED", "File is required"));
      const origin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
      return res.status(201).json({
        url: `${origin}/media/${file.filename}`,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      });
    });
  });

  app.get("/api/admin/fonts", adminAuthMiddleware, (_req, res) => {
    return res.json({ fonts: readFontLibrary(env.mediaDir) });
  });

  app.post("/api/admin/fonts/upload", adminAuthMiddleware, (req, res) => {
    fontUpload.array("files", 30)(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json(apiError("UPLOAD_FAILED", message));
      }
      const files = (req as express.Request & { files?: Express.Multer.File[] }).files ?? [];
      if (!files.length)
        return res.status(400).json(apiError("FILES_REQUIRED", "At least one file is required"));
      const familyRaw = typeof req.body?.family === "string" ? req.body.family.trim() : "";
      if (!familyRaw)
        return res.status(400).json(apiError("FAMILY_REQUIRED", "Family is required"));
      const kindRaw = req.body?.kind;
      const kind = kindRaw === "variable" ? "variable" : "static";
      const origin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
      const created: Array<{
        id: string;
        family: string;
        url: string;
        kind: "static" | "variable";
        fileName: string;
        sha256: string;
        createdAt: string;
      }> = [];
      let replacedFamily = false;
      let duplicateCount = 0;
      const details: Array<{
        fileName: string;
        status: "created" | "duplicate";
        family: string;
        kind: "static" | "variable";
      }> = [];
      console.info("[fonts] upload batch started", {
        family: familyRaw,
        kind,
        files: files.length,
      });
      for (const file of files) {
        const fileUrl = `${origin}/media/${file.filename}`;
        const result = registerFont({
          mediaDir: env.mediaDir,
          fileName: file.originalname || file.filename,
          filePath: file.path,
          fileUrl,
          family: familyRaw,
          kind,
        });
        if (result.duplicate) {
          duplicateCount += 1;
          fs.unlink(file.path, () => {});
          details.push({
            fileName: file.originalname || file.filename,
            status: "duplicate",
            family: result.font.family,
            kind: result.font.kind,
          });
          console.warn("[fonts] duplicate skipped", {
            fileName: file.originalname || file.filename,
            family: result.font.family,
            kind: result.font.kind,
          });
          continue;
        }
        if (result.replacedFamily) replacedFamily = true;
        created.push(result.font);
        details.push({
          fileName: file.originalname || file.filename,
          status: "created",
          family: result.font.family,
          kind: result.font.kind,
        });
        console.info("[fonts] file registered", {
          fileName: file.originalname || file.filename,
          family: result.font.family,
          kind: result.font.kind,
          replacedFamily: result.replacedFamily,
        });
      }
      if (!created.length) {
        console.warn("[fonts] batch finished with no new fonts", {
          family: familyRaw,
          kind,
          duplicateCount,
        });
        return res.status(409).json({ error: "Все выбранные шрифты уже загружены" });
      }
      console.info("[fonts] upload batch completed", {
        family: familyRaw,
        kind,
        created: created.length,
        duplicateCount,
        replacedFamily,
      });
      return res.status(201).json({ fonts: created, replacedFamily, duplicateCount, details });
    });
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
      return res
        .status(409)
        .json({ error: error instanceof Error ? error.message : "Room already exists" });
    }
  });

  app.get("/api/admin/rooms/:eventName", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const room = await getRoomByEventName(eventName);
    if (!room) return res.status(404).json({ error: "Not found" });
    return res.json(room);
  });

  app.get("/api/admin/rooms/:eventName/participants", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const room = await getRoomByEventName(eventName);
    if (!room) return res.status(404).json({ error: "Not found" });
    const nicknames = await listParticipantNicknamesByEventName(eventName);
    return res.json({ nicknames });
  });

  app.patch("/api/admin/rooms/:eventName", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const room = await updateRoomTitle(eventName, parsed.data.title);
      return res.json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Not found";
      return res
        .status(message === "Room title already exists" ? 409 : 404)
        .json({ error: message });
    }
  });

  app.post("/api/admin/rooms/:eventName/reset-test-data", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    if (eventName !== "demo") {
      return res.status(404).json({ error: "Not supported" });
    }
    try {
      const result = await resetDemoQuizToDefault();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to reset demo test data",
      });
    }
  });

  app.put("/api/admin/rooms/:eventName/questions", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const parsed = replaceRoomContentSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first?.path?.length ? first.path.join(".") : "payload";
      const message = first?.message ?? "Invalid payload";
      return res.status(400).json({ error: `${where}: ${message}` });
    }
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
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const questionId = Array.isArray(req.params.questionId)
        ? req.params.questionId[0]
        : req.params.questionId;
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
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const questionId = Array.isArray(req.params.questionId)
        ? req.params.questionId[0]
        : req.params.questionId;
      const detail = await getStandaloneVoteAdminDetail(eventName, questionId);
      if (!detail) return res.status(404).json({ error: "Not found" });
      return res.json(detail);
    },
  );

  app.get(
    "/api/admin/rooms/:eventName/sub-quizzes/:subQuizId/results",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const subQuizId = Array.isArray(req.params.subQuizId)
        ? req.params.subQuizId[0]
        : req.params.subQuizId;
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
    const view = publicViewJsonToState(quiz.publicView);
    return res.json({
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      status: quiz.status,
      brandPlayerBackgroundImageUrl: view.brandPlayerBackgroundImageUrl,
      brandBodyBackgroundColor: view.brandBodyBackgroundColor,
    });
  });

  app.get("/api/quiz/by-slug/:slug/public-report", async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const report = await getPublicReportBySlug(slug);
    if (!report) return res.status(404).json({ error: "Not found" });
    return res.json(report);
  });

  app.get("/api/quiz/by-slug/:slug/public-report.pdf", async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const report = await getPublicReportBySlug(slug);
    if (!report) return res.status(404).json({ error: "Not found" });
    const clientOrigin = env.clientOrigins[0]?.replace(/\/+$/, "") || "http://localhost:5173";
    const pageUrl = `${clientOrigin}/report/${encodeURIComponent(slug)}?pdf=1`;
    try {
      const pdf = await renderPublicReportPdf(report, { pageUrl });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="report-${slug}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      console.error("[public-report.pdf] browser render failed", {
        slug,
        pageUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error:
          "Не удалось сформировать PDF в браузерном режиме. Проверьте CLIENT_ORIGIN и установленный Chromium для Playwright.",
      });
    }
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
      origin: (origin, callback) => {
        const allowed = isCorsOriginAllowed(origin ?? undefined);
        if (!allowed) {
          console.warn("[socket.cors] reject origin", { origin, mode: env.networkMode });
        }
        callback(null, allowed);
      },
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
  if (env.socketIoRequiresRedis) {
    if (!env.redisUrl) {
      throw new Error("CLUSTER_WORKERS>1 requires REDIS_URL (Socket.IO rooms across processes)");
    }
    await attachSocketIoRedisAdapter(io, env.redisUrl);
    console.info("[server] Redis: Socket.IO cluster adapter enabled (required for multi-worker)");
  } else if (env.redisUrl) {
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
