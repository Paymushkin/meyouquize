import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn().mockResolvedValue({ count: 1 });
const localMediaUrlIfFileExists = vi.fn();

vi.mock("../src/prisma.js", () => ({
  prisma: {
    participantProfile: {
      updateMany,
    },
  },
}));

vi.mock("../src/media-cleanup.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/media-cleanup.js")>();
  return {
    ...actual,
    localMediaUrlIfFileExists: (...args: unknown[]) => localMediaUrlIfFileExists(...args),
  };
});

describe("publicNetworkingAvatarUrl", () => {
  beforeEach(() => {
    updateMany.mockClear();
    localMediaUrlIfFileExists.mockReset();
  });

  it("returns existing local url without clearing profile", async () => {
    localMediaUrlIfFileExists.mockReturnValue("/media/ok.png");
    const { publicNetworkingAvatarUrl } = await import("../src/networking-service.js");
    expect(publicNetworkingAvatarUrl("/media/ok.png", "p1")).toBe("/media/ok.png");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("clears missing local avatar from profile", async () => {
    localMediaUrlIfFileExists.mockReturnValue("");
    const { publicNetworkingAvatarUrl } = await import("../src/networking-service.js");
    expect(publicNetworkingAvatarUrl("/media/gone.png", "p1")).toBe("");
    await vi.waitFor(() => {
      expect(updateMany).toHaveBeenCalledWith({
        where: { participantId: "p1", avatarUrl: "/media/gone.png" },
        data: { avatarUrl: "" },
      });
    });
  });

  it("keeps external urls as-is when exists helper returns them", async () => {
    localMediaUrlIfFileExists.mockReturnValue("https://cdn.example/a.png");
    const { publicNetworkingAvatarUrl } = await import("../src/networking-service.js");
    expect(publicNetworkingAvatarUrl("https://cdn.example/a.png", "p1")).toBe(
      "https://cdn.example/a.png",
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("toPublicNetworkingProfile sanitizes avatarUrl", async () => {
    localMediaUrlIfFileExists.mockReturnValue("");
    const { toPublicNetworkingProfile } = await import("../src/networking-service.js");
    const profile = toPublicNetworkingProfile(
      {
        fullName: "A",
        jobTitle: "",
        company: "",
        avatarUrl: "/media/gone.png",
        offers: "",
        seeking: "",
        phone: "",
        email: "",
        visibleInDirectory: true,
      },
      "p9",
    );
    expect(profile.avatarUrl).toBe("");
    expect(profile.fullName).toBe("A");
  });
});
