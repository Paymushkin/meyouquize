import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config";
import type { QuizState } from "../pages/quiz-play/types";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";

const DEFAULT_BRAND_BODY_BG = "#000000";
const DEFAULT_BRAND_PRIMARY = "#7c5acb";

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

  useEffect(() => {
    document.title = quiz?.title?.trim() || "Квиз";
  }, [quiz?.title]);

  useEffect(() => {
    if (!slug) return;
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
      } catch {
        // ignore network errors, socket state can still provide title later
      }
    })();
    return () => controller.abort();
  }, [slug]);

  const titleText = useMemo(
    () => quiz?.title?.trim() || quizTitle.trim(),
    [quiz?.title, quizTitle],
  );
  const brandPrimaryColor = useMemo(
    () => quiz?.brandPrimaryColor?.trim() || metaBrandPrimaryColor.trim() || DEFAULT_BRAND_PRIMARY,
    [metaBrandPrimaryColor, quiz?.brandPrimaryColor],
  );
  const brandPlayerBackgroundImageUrl = useMemo(
    () =>
      resolveClientAssetUrl(
        quiz?.brandPlayerBackgroundImageUrl?.trim() || metaBrandPlayerBackgroundImageUrl.trim(),
      ),
    [metaBrandPlayerBackgroundImageUrl, quiz?.brandPlayerBackgroundImageUrl],
  );
  const brandBodyBackgroundColor = useMemo(
    () => quiz?.brandBodyBackgroundColor?.trim() || metaBrandBodyBackgroundColor,
    [metaBrandBodyBackgroundColor, quiz?.brandBodyBackgroundColor],
  );

  return {
    titleText,
    brandPrimaryColor,
    brandPlayerBackgroundImageUrl,
    brandBodyBackgroundColor,
  };
}
