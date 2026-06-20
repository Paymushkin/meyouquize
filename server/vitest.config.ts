import { defineConfig } from "vitest/config";

/** Pure modules with unit tests — excludes DB-heavy services (quiz-service, app, feedback CRUD). */
const SERVER_PURE_COVERAGE_INCLUDE = [
  "src/scoring.ts",
  "src/profanity.ts",
  "src/reactions-service.ts",
  "src/reaction-widget-stats.ts",
  "src/cors-allow.ts",
  "src/socket/submit-rate-limit.ts",
];

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/integration/**"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./vitest.integration.setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
          maxWorkers: 1,
          minWorkers: 1,
          pool: "forks",
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: SERVER_PURE_COVERAGE_INCLUDE,
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: {
        lines: 70,
        branches: 55,
        functions: 65,
        statements: 70,
      },
    },
  },
});
