import type { Server, Socket } from "socket.io";
import { clearSubmitRateLimit } from "./submit-rate-limit.js";
import type { EnrichedSocket } from "./handler-common.js";
import { registerAdminAnswerHandlers } from "./handlers/admin-answers.js";
import { registerQuizAdminHandlers } from "./handlers/quiz-admin.js";
import { registerQuizPlayHandlers } from "./handlers/quiz-play.js";
import { registerResultsDashboardHandlers } from "./handlers/results-dashboard.js";
import { registerSpeakerQuestionsHandlers } from "./handlers/speaker-questions.js";
import { emitQuizOnlineCount } from "./quiz-rooms.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const enrichedSocket = socket as EnrichedSocket;
    console.info("[socket] connected", {
      socketId: enrichedSocket.id,
      isAdmin: !!enrichedSocket.data.isAdmin,
    });

    registerQuizPlayHandlers(enrichedSocket, io);
    registerAdminAnswerHandlers(enrichedSocket, io);
    registerResultsDashboardHandlers(enrichedSocket, io);
    registerQuizAdminHandlers(enrichedSocket, io);
    registerSpeakerQuestionsHandlers(enrichedSocket, io);

    enrichedSocket.on("disconnect", (reason) => {
      clearSubmitRateLimit(enrichedSocket.id);
      if (
        typeof enrichedSocket.data.quizId === "string" &&
        enrichedSocket.data.quizId.trim().length > 0
      ) {
        void emitQuizOnlineCount(io, enrichedSocket.data.quizId);
      }
      console.info("[socket] disconnected", { socketId: enrichedSocket.id, reason });
    });
  });
}
