import { describe, expect, it } from "vitest";
import {
  getDashboardResults,
  getParticipantPersonalSubQuizReport,
  getQuizPublicState,
  getRoomByEventName,
  submitAnswer,
} from "../../src/quiz-service.js";
import {
  activateQuestion,
  joinPlayer,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";

describe("results", () => {
  it("returns public state with active question", async () => {
    const { quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("state"));
    await activateQuestion(quizId, question.id);

    const state = await getQuizPublicState(quizId);
    expect(state?.activeQuestion?.id).toBe(question.id);
    expect(state?.activeQuestions.length).toBeGreaterThan(0);
  });

  it("builds dashboard leaderboard after correct answer", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("dash"));
    const correctId = question.options.find((o) => o.isCorrect)!.id;
    await activateQuestion(quizId, question.id);
    const player = await joinPlayer(eventName, "Leader", "dev-lb");

    await submitAnswer({
      quizId,
      questionId: question.id,
      optionIds: [correctId],
      participantId: player.participantId,
    });

    const dash = await getDashboardResults(quizId);
    expect(dash.leaderboard.some((row) => row.nickname === "Leader" && row.score === 10)).toBe(
      true,
    );
    expect(dash.perQuestion.some((row) => row.questionId === question.id)).toBe(true);
  });

  it("returns personal sub-quiz report for participant", async () => {
    const { eventName, quizId, subQuizId, question } = await seedSingleChoiceQuiz(
      uniqueSlug("report"),
    );
    const correctId = question.options.find((o) => o.isCorrect)!.id;
    await activateQuestion(quizId, question.id);
    const player = await joinPlayer(eventName, "Reporter", "dev-rpt");

    await submitAnswer({
      quizId,
      questionId: question.id,
      optionIds: [correctId],
      participantId: player.participantId,
    });

    const report = await getParticipantPersonalSubQuizReport(
      quizId,
      player.participantId,
      subQuizId,
    );
    expect(report?.subQuizId).toBe(subQuizId);
    expect(report?.totalScore).toBe(10);
    expect(report?.questions).toHaveLength(1);
    expect(report?.questions[0]?.userAnswerText).toContain("Correct");

    const room = await getRoomByEventName(eventName);
    expect(room?.title).toContain("Room");
  });
});
