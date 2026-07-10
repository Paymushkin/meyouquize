import { describe, expect, it } from "vitest";
import { filterPublicViewSetEmitPayload } from "./filterPublicViewSetEmitPayload";

describe("filterPublicViewSetEmitPayload", () => {
  it("omits player-only fields when patch does not mention them", () => {
    const payload = {
      quizId: "q1",
      mode: "question" as const,
      questionId: "q1",
      speakerTileVisible: true,
      programTileVisible: false,
      projectorBackground: "#000",
    };
    expect(filterPublicViewSetEmitPayload({ mode: "question", questionId: "q1" }, payload)).toEqual(
      {
        quizId: "q1",
        mode: "question",
        questionId: "q1",
      },
    );
  });

  it("includes patched player-only fields", () => {
    const payload = {
      mode: "title" as const,
      speakerTileVisible: true,
      speakerQuestionsEnabled: true,
    };
    expect(filterPublicViewSetEmitPayload({ speakerTileVisible: true }, payload)).toEqual({
      mode: "title",
      speakerTileVisible: true,
    });
  });

  it("includes patched branding fields", () => {
    const payload = {
      mode: "title" as const,
      brandPrimaryColor: "#112233",
      appliedEventThemeKey: "meyou",
    };
    expect(filterPublicViewSetEmitPayload({ brandPrimaryColor: "#112233" }, payload)).toEqual({
      mode: "title",
      brandPrimaryColor: "#112233",
    });
  });
});
