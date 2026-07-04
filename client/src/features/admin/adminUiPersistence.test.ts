import { describe, expect, it, beforeEach } from "vitest";
import {
  readAdminUiPersistence,
  writeAdminUiBannersTab,
  writeAdminUiQuestionsTab,
  writeAdminUiSection,
} from "./adminUiPersistence";

describe("adminUiPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores section and questions tab from v1 storage", () => {
    writeAdminUiSection("demo", "banners");
    writeAdminUiQuestionsTab("demo", "votes");
    writeAdminUiBannersTab("demo", "speaker");

    expect(readAdminUiPersistence("demo")).toEqual({
      section: "banners",
      questionsTab: "votes",
      bannersTab: "speaker",
      resultsSubQuizId: "",
    });
  });

  it("falls back to legacy keys when v1 storage is missing", () => {
    localStorage.setItem("mq_admin_section_demo", "report");
    localStorage.setItem("mq_admin_room_questions_tab_demo", "feedback");

    expect(readAdminUiPersistence("demo")).toMatchObject({
      section: "report",
      questionsTab: "feedback",
      bannersTab: "banner",
    });
  });

  it("migrates legacy photo_wall questions tab to photo_wall section", () => {
    localStorage.setItem(
      "mq_admin_ui_v1_demo",
      JSON.stringify({ tabs: { questions: "photo_wall" } }),
    );

    expect(readAdminUiPersistence("demo")).toMatchObject({
      section: "photo_wall",
      questionsTab: "quizzes",
    });
  });
});
