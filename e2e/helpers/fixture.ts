import fs from "node:fs";
import path from "node:path";

export type E2eFixture = {
  runId: string;
  slug: string;
  title: string;
  quizId: string;
  subQuizId: string;
  singleQuestionId: string;
  singleCorrectOptionId: string;
  voteQuestionId: string;
  tagQuestionId: string;
  rankingQuestionId: string;
  rankingOptionIds: string[];
  feedbackFormId: string;
  mediaDir: string;
};

const fixturePath = path.resolve(process.cwd(), "e2e/.fixture-state.json");

export function readE2eFixture(): E2eFixture {
  const raw = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(raw) as E2eFixture;
}

export function getE2eFixture(): E2eFixture {
  return readE2eFixture();
}
