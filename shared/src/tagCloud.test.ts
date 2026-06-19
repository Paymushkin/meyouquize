import { describe, expect, it } from "vitest";
import {
  collectTagCloudCorrectAliases,
  expandTagCloudSubmitLines,
  normalizeTagComparable,
  parseStoredTagAnswersJson,
  parseTagCloudReferenceAliases,
  splitTagCloudUserInput,
  tagMatchesReferenceAliases,
} from "./index.js";

describe("normalizeTagComparable", () => {
  it("normalizes case, spaces and trailing dots", () => {
    expect(normalizeTagComparable("  Синий.  ")).toBe("синий");
    expect(normalizeTagComparable("A\u2003B")).toBe("a b");
  });
});

describe("parseTagCloudReferenceAliases", () => {
  it("splits synonyms by semicolon and comma", () => {
    expect(parseTagCloudReferenceAliases("синий; голубой, navy")).toEqual([
      "синий",
      "голубой",
      "navy",
    ]);
  });

  it("deduplicates aliases", () => {
    expect(parseTagCloudReferenceAliases("да, Да; да")).toEqual(["да"]);
  });
});

describe("tagMatchesReferenceAliases", () => {
  it("matches user input against reference option", () => {
    expect(tagMatchesReferenceAliases("голубой", "синий; голубой")).toBe(true);
    expect(tagMatchesReferenceAliases("красный", "синий; голубой")).toBe(false);
  });
});

describe("splitTagCloudUserInput", () => {
  it("splits and normalizes participant input", () => {
    expect(splitTagCloudUserInput("A; b, C")).toEqual(["a", "b", "c"]);
  });
});

describe("expandTagCloudSubmitLines", () => {
  it("flattens multiple answer lines", () => {
    expect(expandTagCloudSubmitLines(["синий", "голубой; navy"])).toEqual([
      "синий",
      "голубой",
      "navy",
    ]);
  });

  it("skips empty lines", () => {
    expect(expandTagCloudSubmitLines(["", "  "])).toEqual([]);
  });
});

describe("parseStoredTagAnswersJson", () => {
  it("parses JSON array of tags", () => {
    expect(parseStoredTagAnswersJson('["синий", "голубой"]')).toEqual(["синий", "голубой"]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseStoredTagAnswersJson("not-json")).toEqual([]);
  });
});

describe("collectTagCloudCorrectAliases", () => {
  it("collects aliases only from correct options", () => {
    expect(
      collectTagCloudCorrectAliases([
        { text: "синий; голубой", isCorrect: true },
        { text: "красный", isCorrect: false },
      ]),
    ).toEqual(["синий", "голубой"]);
  });
});
