import type { EnrichedSocket } from "./socket/handler-common.js";
import { getParticipantScoresBySubQuiz, getParticipantTotalScoreForQuiz } from "./quiz-service.js";

/** После answer:submitted — не блокировать обработчик сокета запросами score. */
export function schedulePlayerQuizScoreEmit(
  socket: EnrichedSocket,
  quizId: string,
  participantId: string,
) {
  setImmediate(() => {
    void (async () => {
      try {
        const [myTotalScore, mySubQuizScores] = await Promise.all([
          getParticipantTotalScoreForQuiz(quizId, participantId),
          getParticipantScoresBySubQuiz(quizId, participantId),
        ]);
        socket.emit("player:quiz-score", { myTotalScore, mySubQuizScores });
      } catch {
        // Баллы подтянутся при следующем state:quiz.
      }
    })();
  });
}
