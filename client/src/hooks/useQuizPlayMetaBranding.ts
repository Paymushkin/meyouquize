import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config";
import type { QuizState } from "../pages/quiz-play/types";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";

const DEFAULT_BRAND_BODY_BG = "#000000";
const DEFAULT_BRAND_PRIMARY = "#7c5acb";
const DEFAULT_BRAND_ACCENT = "#F3F722";
const DEFAULT_BRAND_TEXT = "#111111";
const DEFAULT_BRAND_INPUT_TEXT = "#ffffff";

type Params = {
  slug: string;
  quiz: QuizState | null;
};

export function useQuizPlayMetaBranding({ slug, quiz }: Params) {
  const [quizTitle, setQuizTitle] = useState("");
  const [metaBrandPlayerBackgroundImageUrl, setMetaBrandPlayerBackgroundImageUrl] = useState("");
  const [metaBrandBodyBackgroundColor, setMetaBrandBodyBackgroundColor] =
    useState(DEFAULT_BRAND_BODY_BG);
  const [metaBrandPrimaryColor, setMetaBrandPrimaryColor] = useState(DEFAULT_BRAND_PRIMARY);
  const [metaBrandAccentColor, setMetaBrandAccentColor] = useState(DEFAULT_BRAND_ACCENT);
  const [metaBrandTextColor, setMetaBrandTextColor] = useState(DEFAULT_BRAND_TEXT);
  const [metaBrandInputTextColor, setMetaBrandInputTextColor] = useState(DEFAULT_BRAND_INPUT_TEXT);
  const [metaBrandLogoUrl, setMetaBrandLogoUrl] = useState("");
  const [metaBrandFontFamily, setMetaBrandFontFamily] = useState("");
  const [metaBrandFontUrl, setMetaBrandFontUrl] = useState("");
  const [joinMetaLoaded, setJoinMetaLoaded] = useState(!slug);
  const [playerAutoJoinRandomNickname, setPlayerAutoJoinRandomNickname] = useState(false);

  useEffect(() => {
    document.title = quiz?.title?.trim() || "Квиз";
  }, [quiz?.title]);

  useEffect(() => {
    if (typeof quiz?.title === "string") {
      setQuizTitle(quiz.title);
    }
  }, [quiz?.title]);

  useEffect(() => {
    if (!slug) {
      setJoinMetaLoaded(true);
      return;
    }
    setJoinMetaLoaded(false);
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/quiz/by-slug/${slug}/meta`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          title?: string;
          brandPlayerBackgroundImageUrl?: string;
          brandBodyBackgroundColor?: string;
          brandPrimaryColor?: string;
          brandAccentColor?: string;
          brandTextColor?: string;
          brandInputTextColor?: string;
          brandLogoUrl?: string;
          brandFontFamily?: string;
          brandFontUrl?: string;
          playerAutoJoinRandomNickname?: boolean;
        };
        if (typeof payload.title === "string") {
          setQuizTitle(payload.title);
        }
        if (typeof payload.brandPlayerBackgroundImageUrl === "string") {
          setMetaBrandPlayerBackgroundImageUrl(payload.brandPlayerBackgroundImageUrl);
        }
        if (
          typeof payload.brandBodyBackgroundColor === "string" &&
          payload.brandBodyBackgroundColor.trim()
        ) {
          setMetaBrandBodyBackgroundColor(payload.brandBodyBackgroundColor);
        }
        if (typeof payload.brandPrimaryColor === "string" && payload.brandPrimaryColor.trim()) {
          setMetaBrandPrimaryColor(payload.brandPrimaryColor);
        }
        if (typeof payload.brandAccentColor === "string" && payload.brandAccentColor.trim()) {
          setMetaBrandAccentColor(payload.brandAccentColor);
        }
        if (typeof payload.brandTextColor === "string" && payload.brandTextColor.trim()) {
          setMetaBrandTextColor(payload.brandTextColor);
        }
        if (typeof payload.brandInputTextColor === "string" && payload.brandInputTextColor.trim()) {
          setMetaBrandInputTextColor(payload.brandInputTextColor);
        }
        if (typeof payload.brandLogoUrl === "string") {
          setMetaBrandLogoUrl(payload.brandLogoUrl);
        }
        if (typeof payload.brandFontFamily === "string" && payload.brandFontFamily.trim()) {
          setMetaBrandFontFamily(payload.brandFontFamily);
        }
        if (typeof payload.brandFontUrl === "string") {
          setMetaBrandFontUrl(payload.brandFontUrl);
        }
        if (typeof payload.playerAutoJoinRandomNickname === "boolean") {
          setPlayerAutoJoinRandomNickname(payload.playerAutoJoinRandomNickname);
        }
      } catch {
        // ignore network errors, socket state can still provide title later
      } finally {
        if (!controller.signal.aborted) {
          setJoinMetaLoaded(true);
        }
      }
    })();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (typeof quiz?.playerAutoJoinRandomNickname === "boolean") {
      setPlayerAutoJoinRandomNickname(quiz.playerAutoJoinRandomNickname);
    }
  }, [quiz?.playerAutoJoinRandomNickname]);

  useEffect(() => {
    if (typeof quiz?.brandPlayerBackgroundImageUrl === "string") {
      setMetaBrandPlayerBackgroundImageUrl(quiz.brandPlayerBackgroundImageUrl);
    }
    if (typeof quiz?.brandLogoUrl === "string") {
      setMetaBrandLogoUrl(quiz.brandLogoUrl);
    }
    if (typeof quiz?.brandFontFamily === "string" && quiz.brandFontFamily.trim()) {
      setMetaBrandFontFamily(quiz.brandFontFamily);
    }
    if (typeof quiz?.brandFontUrl === "string") {
      setMetaBrandFontUrl(quiz.brandFontUrl);
    }
  }, [
    quiz?.brandFontFamily,
    quiz?.brandFontUrl,
    quiz?.brandLogoUrl,
    quiz?.brandPlayerBackgroundImageUrl,
  ]);

  const titleText = useMemo(
    () => quiz?.title?.trim() || quizTitle.trim(),
    [quiz?.title, quizTitle],
  );
  const brandPrimaryColor = useMemo(
    () => quiz?.brandPrimaryColor?.trim() || metaBrandPrimaryColor.trim() || DEFAULT_BRAND_PRIMARY,
    [metaBrandPrimaryColor, quiz?.brandPrimaryColor],
  );
  const brandPlayerBackgroundImageUrl = useMemo(() => {
    const raw =
      quiz != null
        ? (quiz.brandPlayerBackgroundImageUrl ?? "").trim()
        : metaBrandPlayerBackgroundImageUrl.trim();
    return raw ? resolveClientAssetUrl(raw) : "";
  }, [metaBrandPlayerBackgroundImageUrl, quiz]);
  const brandLogoUrl = useMemo(() => {
    const raw = quiz != null ? (quiz.brandLogoUrl ?? "").trim() : metaBrandLogoUrl.trim();
    return raw ? resolveClientAssetUrl(raw) : "";
  }, [metaBrandLogoUrl, quiz]);
  const brandBodyBackgroundColor = useMemo(
    () => quiz?.brandBodyBackgroundColor?.trim() || metaBrandBodyBackgroundColor,
    [metaBrandBodyBackgroundColor, quiz?.brandBodyBackgroundColor],
  );
  const brandTextColor = useMemo(
    () => quiz?.brandTextColor?.trim() || metaBrandTextColor.trim() || DEFAULT_BRAND_TEXT,
    [metaBrandTextColor, quiz?.brandTextColor],
  );
  const formTextColor = useMemo(
    () => quiz?.brandTextColor?.trim() || metaBrandTextColor.trim() || DEFAULT_BRAND_TEXT,
    [metaBrandTextColor, quiz?.brandTextColor],
  );
  const formBackgroundColor = useMemo(
    () => quiz?.brandAccentColor?.trim() || metaBrandAccentColor.trim() || DEFAULT_BRAND_ACCENT,
    [metaBrandAccentColor, quiz?.brandAccentColor],
  );
  const formInputTextColor = useMemo(
    () =>
      quiz?.brandInputTextColor?.trim() ||
      metaBrandInputTextColor.trim() ||
      DEFAULT_BRAND_INPUT_TEXT,
    [metaBrandInputTextColor, quiz?.brandInputTextColor],
  );
  const brandFontFamily = useMemo(
    () => quiz?.brandFontFamily?.trim() || metaBrandFontFamily.trim() || "Jost, Arial, sans-serif",
    [metaBrandFontFamily, quiz?.brandFontFamily],
  );
  const brandFontUrl = useMemo(
    () => quiz?.brandFontUrl?.trim() || metaBrandFontUrl.trim() || "",
    [metaBrandFontUrl, quiz?.brandFontUrl],
  );

  return {
    titleText,
    brandPrimaryColor,
    brandTextColor,
    formTextColor,
    formBackgroundColor,
    formInputTextColor,
    brandPlayerBackgroundImageUrl,
    brandBodyBackgroundColor,
    brandLogoUrl,
    brandFontFamily,
    brandFontUrl,
    joinMetaLoaded,
    playerAutoJoinRandomNickname,
  };
}
