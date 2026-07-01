import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Extracted logic covered by unit tests — not page shells (AdminEventPage, QuizPlayPage). */
const CLIENT_LOGIC_COVERAGE_INCLUDE = [
  "src/admin/adminEventTypes.ts",
  "src/admin/adminEventForm.ts",
  "src/features/admin/adminQuestionFormPatch.ts",
  "src/features/admin/adminQuestionProjectorFlow.ts",
  "src/features/adminBanners/buildOrderedTiles.ts",
  "src/features/branding/brandVisual.ts",
  "src/features/projectorChart/resolveProjectorOptionRowSizes.ts",
  "src/features/projectorPage/projectorDerived.ts",
  "src/features/projectorPage/projectorSessionReducer.ts",
  "src/features/quizPlay/playerQuizResults.ts",
  "src/features/quizPlay/playerVisibleResultsFormat.ts",
  "src/features/quizPlay/tiles.ts",
  "src/features/quizPlay/voteOptionImages.ts",
  "src/features/randomizer/randomizerLogic.ts",
  "src/features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings.ts",
  "src/features/speakerQuestionsAdmin/speakerQuestionsSort.ts",
  "src/features/speakerQuestionsAdmin/useSpeakerQuestionsTableState.ts",
  "src/features/tagCloudMerge.ts",
  "src/features/voteUi/temperatureScaleUi.ts",
  "src/features/voteUi/voteQuestionLayout.ts",
  "src/hooks/useQuizPlayCompletion.ts",
  "src/hooks/useQuizPlayFeedback.ts",
  "src/hooks/useQuizPlayQuestionFlow.ts",
  "src/hooks/useRandomizerAnimation.ts",
  "src/pages/quiz-play/getQuestionTypeLabel.ts",
  "src/pages/quiz-play/resolveQuizProgressDisplay.ts",
  "src/pages/results/speakerTargetLabel.ts",
  "src/storage.ts",
  "src/utils/safeUrls.ts",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@meyouquize/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    env: {
      NODE_ENV: "test",
    },
    setupFiles: ["./vitest.setup.ts"],
    environment: "node",
    environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: CLIENT_LOGIC_COVERAGE_INCLUDE,
      exclude: ["src/**/*.test.{ts,tsx}", "src/main.tsx"],
      thresholds: {
        lines: 60,
        branches: 55,
        functions: 55,
        statements: 60,
      },
    },
  },
});
