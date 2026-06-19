import { describe, expect, it } from "vitest";
import { createRoom, joinQuiz, updateParticipantNickname } from "../../src/quiz-service.js";
import { prisma } from "../../src/prisma.js";

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

describe("player flow", () => {
  it("joins participant and reuses device on second join", async () => {
    const slug = uniqueSlug("join");
    await createRoom({ eventName: slug, title: `Room ${slug}` });

    const first = await joinQuiz({ slug, nickname: "Player One", deviceId: "device-a" });
    const second = await joinQuiz({ slug, nickname: "Player Renamed", deviceId: "device-a" });

    expect(second.participantId).toBe(first.participantId);
    const participant = await prisma.participant.findUnique({ where: { id: first.participantId } });
    expect(participant?.nickname).toBe("Player Renamed");
  });

  it("rejects duplicate nickname for different devices", async () => {
    const slug = uniqueSlug("dup-nick");
    await createRoom({ eventName: slug, title: `Room ${slug}` });

    await joinQuiz({ slug, nickname: "SameNick", deviceId: "device-1" });
    await expect(joinQuiz({ slug, nickname: "SameNick", deviceId: "device-2" })).rejects.toThrow(
      "Ник уже используется",
    );
  });

  it("sanitizes profane nickname on join", async () => {
    const slug = uniqueSlug("profanity");
    await createRoom({ eventName: slug, title: `Room ${slug}` });

    const joined = await joinQuiz({ slug, nickname: "мудак", deviceId: "device-x" });
    const participant = await prisma.participant.findUnique({
      where: { id: joined.participantId },
    });
    expect(participant?.nickname).toBe("Участник");
  });

  it("updates nickname via service", async () => {
    const slug = uniqueSlug("rename");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    const joined = await joinQuiz({ slug, nickname: "Old", deviceId: "device-y" });

    await updateParticipantNickname({
      quizId: joined.quizId,
      participantId: joined.participantId,
      nickname: "New Name",
    });

    const participant = await prisma.participant.findUnique({
      where: { id: joined.participantId },
    });
    expect(participant?.nickname).toBe("New Name");
  });
});
