import { Prisma } from "@prisma/client";
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
import { isAdminAuthBypassed } from "./admin-auth-guard.js";
import { env } from "./env.js";
import { logError } from "./logging.js";
import {
  adminAuthSchema,
  createRoomSchema,
  patchQuestionAdminDoneSchema,
  patchQuestionProjectorSchema,
  patchSubQuizTitleSchema,
  patchTagCloudManualSchema,
  replaceRoomContentSchema,
  updateRoomSchema,
  upsertFeedbackFormSchema,
  createEventThemeSchema,
  updateEventThemeSchema,
} from "./schemas.js";
import { isAdminTokenValid } from "./admin-session-cache.js";
import { registerSocketHandlers } from "./socket/register-handlers.js";
import {
  broadcastDashboardResultsNow,
  broadcastProjectorRoomSync,
} from "./socket/dashboard-results.js";
import { getSocketIo, setSocketIo } from "./socket/io-holder.js";
import { attachSocketIoRedisAdapter } from "./socket/redis-io-adapter.js";
import { isPrivateNetworkViteDevPort } from "./cors-allow.js";
import { prisma } from "./prisma.js";
import { randomToken } from "./utils.js";
import {
  readFontLibrary,
  registerFont,
  deleteFont,
  publicFontEntry,
  updateFontRegistryEntry,
  isValidWoff2File,
} from "./font-library.js";
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
  patchQuestionAdminDone,
  patchQuestionProjectorSettings,
  patchTagCloudManualByQuestionId,
  replaceRoomContent,
  updateRoomTitle,
  updateSubQuizTitle,
} from "./quiz-service.js";
import {
  createFeedbackForm,
  getFeedbackFormById,
  getQuizIdByEventName,
  listFeedbackFormsByQuizId,
  listFeedbackResultsByQuizId,
  updateFeedbackFormConfig,
} from "./feedback-service.js";
import {
  createEventTheme,
  deleteEventTheme,
  getEventThemeById,
  listEventThemes,
  updateEventTheme,
} from "./event-theme-service.js";
import { renderPublicReportPdf, resolveReportPdfPageOrigin } from "./report-pdf.js";
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
  if (isAdminAuthBypassed()) return next();
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
      const ext = path.extname(file.originalname || "").toLowerCase();
      const mime = (file.mimetype || "").toLowerCase();
      // SVG часто используется для stored-XSS (через `<img src>`/`<object>` в зависимости от браузера).
      // Поэтому запрещаем SVG полностью.
      if (mime === "image/svg+xml" || ext === ".svg") {
        cb(new Error("SVG images are not allowed"));
        return;
      }
      if (mime.startsWith("image/")) cb(null, true);
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
  app.use(
    "/media",
    express.static(env.mediaDir, {
      setHeaders: (res) => {
        // Важно для защиты от контент-спуфинга (например, когда файл с неправильным mimetype
        // может быть интерпретирован браузером как скрипт/HTML).
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );

  app.get("/", (_req, res) => {
    return res.json({ service: "meyouquize-backend", status: "ok" });
  });

  app.get("/healthz", (_req, res) => {
    return res.status(200).json({
      ok: true,
      /** Проверка деплоя: на VPS должно быть `quiz-all`, иначе зачёт облака тегов только по первому эталону. */
      tagCloudReferenceScope: "quiz-all",
      /** Счётчик «Вопрос N/M» у игрока: orderedQuestionIds + stepIndex на activeQuestion. */
      quizProgressOrderedIds: true,
    });
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
    limit: env.networkMode === "internet" ? 600 : 1200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (isAdminAuthBypassed()) return true;
      const token = req.cookies?.[ADMIN_COOKIE];
      return Boolean(token?.trim());
    },
    message: { error: "Too many admin API requests. Please try again in a minute." },
  });

  // Playwright-based PDF rendering очень дорого (headless browser запуск + рендер).
  // Ограничиваем генерацию публичных PDF, чтобы не получить DoS от не доверенного игрока.
  const publicReportPdfLimiter = rateLimit({
    windowMs: 60_000,
    limit: env.networkMode === "internet" ? 5 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many PDF requests. Please try again later." },
  });

  app.post("/api/admin/auth", authLimiter, async (req, res) => {
    if (isAdminAuthBypassed()) {
      return res.json({ ok: true, bypass: true });
    }
    const parsed = adminAuthSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json(apiError("INVALID_PAYLOAD", "Invalid payload"));
    if (!adminCredentialMatch(env.adminAccounts, parsed.data.login, parsed.data.password)) {
      return res.status(401).json(apiError("WRONG_CREDENTIALS", "Wrong credentials"));
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env.adminSessionHours * 60 * 60 * 1000);
    try {
      await prisma.adminSession.create({
        data: { token, expiresAt },
      });
    } catch (err) {
      logError("[admin] session create failed", err);
      return res.status(503).json(apiError("DB_UNAVAILABLE", "Database temporarily unavailable"));
    }
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

  app.get("/api/admin/fonts", adminAuthMiddleware, (req, res) => {
    const origin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
    const fonts = readFontLibrary(env.mediaDir).map((font) => publicFontEntry(font, origin));
    return res.json({ fonts });
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
      if (kind === "variable" && files.length > 1) {
        return res
          .status(400)
          .json(apiError("INVALID_VARIABLE_BATCH", "Variable font upload accepts only one file"));
      }
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
      const duplicateFonts: Array<{
        id: string;
        family: string;
        url: string;
        kind: "static" | "variable";
        fileName: string;
        sha256: string;
        createdAt: string;
      }> = [];
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
      let rejectedCount = 0;
      let invalidFormatCount = 0;
      for (const file of files) {
        if (!isValidWoff2File(file.path)) {
          invalidFormatCount += 1;
          fs.unlink(file.path, () => {});
          details.push({
            fileName: file.originalname || file.filename,
            status: "duplicate",
            family: familyRaw,
            kind,
          });
          continue;
        }
        const fileUrl = `${origin}/media/${file.filename}`;
        const result = registerFont({
          mediaDir: env.mediaDir,
          fileName: file.originalname || file.filename,
          filePath: file.path,
          fileUrl,
          family: familyRaw,
          kind,
        });
        if (result.rejected === "static_blocked_by_variable") {
          rejectedCount += 1;
          fs.unlink(file.path, () => {});
          details.push({
            fileName: file.originalname || file.filename,
            status: "duplicate",
            family: result.font.family,
            kind: result.font.kind,
          });
          continue;
        }
        if (result.duplicate) {
          duplicateCount += 1;
          const clientFont = publicFontEntry(result.font, origin);
          updateFontRegistryEntry(env.mediaDir, clientFont);
          duplicateFonts.push(clientFont);
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
        if (invalidFormatCount > 0) {
          return res.status(400).json({
            error:
              "Файл не является настоящим WOFF2. Конвертируйте шрифт (например, через fonttools или transfonter) и загрузите снова.",
            invalidFormatCount,
            details,
          });
        }
        if (rejectedCount > 0) {
          return res.status(409).json({
            error: "Для этого семейства уже загружен вариативный шрифт",
            duplicateCount,
            rejectedCount,
            details,
          });
        }
        if (duplicateFonts.length) {
          console.info("[fonts] batch reused existing fonts", {
            family: familyRaw,
            kind,
            duplicateCount,
          });
          return res.status(200).json({
            fonts: duplicateFonts,
            duplicateCount,
            details,
            reused: true,
          });
        }
        console.warn("[fonts] batch finished with no new fonts", {
          family: familyRaw,
          kind,
          duplicateCount,
        });
        return res.status(409).json({
          error: "Все выбранные шрифты уже загружены",
          fonts: duplicateFonts,
          duplicateCount,
          details,
        });
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

  app.delete("/api/admin/fonts/:id", adminAuthMiddleware, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = deleteFont(env.mediaDir, id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  });

  app.get("/api/admin/event-themes", adminAuthMiddleware, async (_req, res) => {
    const themes = await listEventThemes();
    return res.json(themes);
  });

  app.get("/api/admin/event-themes/:id", adminAuthMiddleware, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const theme = await getEventThemeById(id);
    if (!theme) return res.status(404).json({ error: "Not found" });
    return res.json(theme);
  });

  app.post("/api/admin/event-themes", adminAuthMiddleware, async (req, res) => {
    const parsed = createEventThemeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const theme = await createEventTheme(parsed.data);
      return res.status(201).json(theme);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return res.status(409).json({ error: "Theme name already exists" });
      }
      throw error;
    }
  });

  app.put("/api/admin/event-themes/:id", adminAuthMiddleware, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateEventThemeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    try {
      const theme = await updateEventTheme(id, parsed.data);
      if (!theme) return res.status(404).json({ error: "Not found" });
      return res.json(theme);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return res.status(409).json({ error: "Theme name already exists" });
      }
      throw error;
    }
  });

  app.delete("/api/admin/event-themes/:id", adminAuthMiddleware, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const ok = await deleteEventTheme(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
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

  app.patch(
    "/api/admin/rooms/:eventName/tag-cloud-manual",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const parsed = patchTagCloudManualSchema.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const where = first?.path?.length ? first.path.join(".") : "payload";
        const message = first?.message ?? "Invalid payload";
        return res.status(400).json({ error: `${where}: ${message}` });
      }
      try {
        const quizId = await patchTagCloudManualByQuestionId(
          eventName,
          parsed.data.tagCloudManualByQuestionId,
        );
        const room = await getRoomByEventName(eventName);
        const io = getSocketIo();
        if (io && quizId) {
          await broadcastProjectorRoomSync(io, quizId);
        }
        return res.json(room);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Not found";
        return res.status(message === "Room not found" ? 404 : 400).json({ error: message });
      }
    },
  );

  app.patch(
    "/api/admin/rooms/:eventName/sub-quizzes/:subQuizId",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const subQuizId = Array.isArray(req.params.subQuizId)
        ? req.params.subQuizId[0]
        : req.params.subQuizId;
      const parsed = patchSubQuizTitleSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      try {
        const quizId = await updateSubQuizTitle(eventName, subQuizId, parsed.data.title);
        return res.json({ ok: true, quizId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Not found";
        return res.status(message === "SubQuiz not found" ? 404 : 404).json({ error: message });
      }
    },
  );

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
      const io = getSocketIo();
      if (io && room?.id) {
        await broadcastProjectorRoomSync(io, room.id);
      }
      return res.json(room);
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
    }
  });

  app.patch(
    "/api/admin/rooms/:eventName/questions/:questionId/admin-done",
    adminAuthMiddleware,
    async (req, res) => {
      const eventName = Array.isArray(req.params.eventName)
        ? req.params.eventName[0]
        : req.params.eventName;
      const questionId = Array.isArray(req.params.questionId)
        ? req.params.questionId[0]
        : req.params.questionId;
      const parsed = patchQuestionAdminDoneSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      try {
        const quizId = await patchQuestionAdminDone(eventName, questionId, parsed.data.adminDone);
        const io = getSocketIo();
        if (io) {
          await broadcastDashboardResultsNow(io, quizId);
        }
        return res.status(204).end();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Not found";
        const code = message === "Room not found" || message === "Question not found" ? 404 : 500;
        return res.status(code).json({ error: message });
      }
    },
  );

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
        const quizId = await patchQuestionProjectorSettings(eventName, questionId, parsed.data);
        const io = getSocketIo();
        if (io) {
          await broadcastDashboardResultsNow(io, quizId);
        }
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

  app.get("/api/admin/rooms/:eventName/feedback", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const quizId = await getQuizIdByEventName(eventName);
    if (!quizId) return res.status(404).json({ error: "Room not found" });
    const forms = await listFeedbackFormsByQuizId(quizId);
    return res.json(forms);
  });

  app.post("/api/admin/rooms/:eventName/feedback", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const parsed = upsertFeedbackFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const quizId = await getQuizIdByEventName(eventName);
    if (!quizId) return res.status(404).json({ error: "Room not found" });
    try {
      const form = await createFeedbackForm(quizId, parsed.data);
      return res.status(201).json(form);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      return res.status(400).json({ error: message });
    }
  });

  app.put("/api/admin/rooms/:eventName/feedback/:formId", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const formId = Array.isArray(req.params.formId) ? req.params.formId[0] : req.params.formId;
    const parsed = upsertFeedbackFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const quizId = await getQuizIdByEventName(eventName);
    if (!quizId) return res.status(404).json({ error: "Room not found" });
    const existing = await getFeedbackFormById(formId);
    if (!existing || existing.quizId !== quizId) {
      return res.status(404).json({ error: "Feedback form not found" });
    }
    try {
      const form = await updateFeedbackFormConfig(formId, parsed.data);
      return res.json(form);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      return res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/rooms/:eventName/feedback/results", adminAuthMiddleware, async (req, res) => {
    const eventName = Array.isArray(req.params.eventName)
      ? req.params.eventName[0]
      : req.params.eventName;
    const quizId = await getQuizIdByEventName(eventName);
    if (!quizId) return res.status(404).json({ error: "Room not found" });
    const results = await listFeedbackResultsByQuizId(quizId);
    return res.json(results);
  });

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
      brandPrimaryColor: view.brandPrimaryColor,
      brandAccentColor: view.brandAccentColor,
      brandTextColor: view.brandTextColor,
      brandInputTextColor: view.brandInputTextColor,
      playerVoteOptionTextColor: view.playerVoteOptionTextColor,
      playerVoteProgressBarColor: view.playerVoteProgressBarColor,
      brandPlayerBackgroundImageUrl: view.brandPlayerBackgroundImageUrl,
      brandBodyBackgroundColor: view.brandBodyBackgroundColor,
      brandLogoUrl: view.brandLogoUrl,
      brandFontFamily: view.brandFontFamily,
      brandFontUrl: view.brandFontUrl,
      brandFontUrls: view.brandFontUrls,
      playerAutoJoinRandomNickname: view.playerAutoJoinRandomNickname,
    });
  });

  app.get("/api/quiz/by-slug/:slug/public-report", async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) {
      return res.status(404).json(apiError("REPORT_NOT_FOUND", "Report not found"));
    }
    const view = publicViewJsonToState(quiz.publicView);
    if (!view.reportPublished) {
      return res.status(404).json(apiError("REPORT_NOT_PUBLISHED", "Report is not published"));
    }
    const report = await getPublicReportBySlug(slug);
    if (!report) return res.status(404).json(apiError("REPORT_NOT_FOUND", "Report not found"));
    return res.json(report);
  });

  app.get("/api/quiz/by-slug/:slug/public-report.pdf", publicReportPdfLimiter, async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) {
      return res.status(404).json(apiError("REPORT_NOT_FOUND", "Report not found"));
    }
    const view = publicViewJsonToState(quiz.publicView);
    if (!view.reportPublished) {
      return res.status(404).json(apiError("REPORT_NOT_PUBLISHED", "Report is not published"));
    }
    const report = await getPublicReportBySlug(slug);
    if (!report) return res.status(404).json(apiError("REPORT_NOT_FOUND", "Report not found"));
    const clientOrigin = resolveReportPdfPageOrigin(req, env.clientOrigins);
    const pageUrl = `${clientOrigin}/report/${encodeURIComponent(slug)}?pdf=1`;
    try {
      const pdf = await renderPublicReportPdf(report, {
        pageUrl,
        assetOrigin: clientOrigin,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="report-${slug}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      console.error("[public-report.pdf] render failed", {
        slug,
        pageUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error:
          "Не удалось сформировать PDF отчёта. На сервере выполните: npm run install:pdf (или bash deploy/scripts/install-pdf-chromium.sh)",
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
    // Сотни WS: deflate съедает CPU на event loop; для квиза полезная нагрузка в JSON и так невелика.
    perMessageDeflate: false,
    pingInterval: env.socketIoPingIntervalMs,
    pingTimeout: env.socketIoPingTimeoutMs,
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
    if (isAdminAuthBypassed()) {
      socket.data.isAdmin = true;
      next();
      return;
    }
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
      logError("[server] Redis init failed, continuing without cluster adapter", err);
    }
  }
  setSocketIo(io);
  registerSocketHandlers(io);
  return { app, io, httpServer };
}
