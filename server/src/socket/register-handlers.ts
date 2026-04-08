import type { Server, Socket } from "socket.io";
import { clearSubmitRateLimit } from "./submit-rate-limit.js";
import type { EnrichedSocket } from "./handler-common.js";
import { registerAdminAnswerHandlers } from "./handlers/admin-answers.js";
import { registerQuizAdminHandlers } from "./handlers/quiz-admin.js";
import { registerQuizPlayHandlers } from "./handlers/quiz-play.js";
import { registerResultsDashboardHandlers } from "./handlers/results-dashboard.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const enrichedSocket = socket as EnrichedSocket;
    console.info("[socket] connected", { socketId: enrichedSocket.id, isAdmin: !!enrichedSocket.data.isAdmin });

    registerQuizPlayHandlers(enrichedSocket, io);
    registerAdminAnswerHandlers(enrichedSocket, io);
    registerResultsDashboardHandlers(enrichedSocket, io);
    registerQuizAdminHandlers(enrichedSocket, io);

    enrichedSocket.on("disconnect", (reason) => {
      clearSubmitRateLimit(enrichedSocket.id);
      console.info("[socket] disconnected", { socketId: enrichedSocket.id, reason });
    });
  });
}
