import { useEffect } from "react";

export const BODY_NO_DECOR_CLASS = "mq-no-body-decor";

const LEGACY_BODY_DECOR_CLASSES = [
  "mq-brand-bg",
  "mq-player-brand-bg",
  "mq-admin-brand-bg",
  "mq-projector-body-bg",
  "mq-projector-brand-bg",
  "mq-admin-projector-bg",
  "mq-report-bg",
] as const;

export type BodyBrandBackgroundOptions = {
  backgroundColor?: string;
  clearRootBackground?: boolean;
  resetOverflowX?: boolean;
};

type BodyBrandSnapshot = {
  bodyBackgroundColor: string;
  bodyBackgroundImage: string;
  bodyBackgroundAttachment: string;
  bodyOverflowX: string;
  rootBackgroundColor: string;
  hadNoDecorClass: boolean;
};

function captureBodyBrandSnapshot(): BodyBrandSnapshot {
  const root = document.getElementById("root");
  return {
    bodyBackgroundColor: document.body.style.backgroundColor,
    bodyBackgroundImage: document.body.style.backgroundImage,
    bodyBackgroundAttachment: document.body.style.backgroundAttachment,
    bodyOverflowX: document.body.style.overflowX,
    rootBackgroundColor: root?.style.backgroundColor ?? "",
    hadNoDecorClass: document.body.classList.contains(BODY_NO_DECOR_CLASS),
  };
}

function applyBodyBrandBackground(options: BodyBrandBackgroundOptions): void {
  const root = document.getElementById("root");

  document.body.classList.remove(...LEGACY_BODY_DECOR_CLASSES);
  document.body.classList.add(BODY_NO_DECOR_CLASS);
  document.body.style.backgroundImage = "none";
  document.body.style.backgroundAttachment = "";

  if (options.backgroundColor !== undefined) {
    document.body.style.backgroundColor = options.backgroundColor;
  }
  if (options.resetOverflowX) {
    document.body.style.overflowX = "";
  }
  if (options.clearRootBackground && root) {
    root.style.backgroundColor = "transparent";
  }
}

function restoreBodyBrandBackground(
  snapshot: BodyBrandSnapshot,
  options: Pick<BodyBrandBackgroundOptions, "clearRootBackground">,
): void {
  const root = document.getElementById("root");

  document.body.style.backgroundColor = snapshot.bodyBackgroundColor;
  document.body.style.backgroundImage = snapshot.bodyBackgroundImage;
  document.body.style.backgroundAttachment = snapshot.bodyBackgroundAttachment;
  document.body.style.overflowX = snapshot.bodyOverflowX;
  if (!snapshot.hadNoDecorClass) {
    document.body.classList.remove(BODY_NO_DECOR_CLASS);
  }
  if (options.clearRootBackground && root) {
    root.style.backgroundColor = snapshot.rootBackgroundColor;
  }
}

/** Убирает декоративный фон `body` из глобальной темы и задаёт брендовый цвет. */
export function useBodyBrandBackground(options: BodyBrandBackgroundOptions): void {
  const { backgroundColor, clearRootBackground = false, resetOverflowX = false } = options;

  useEffect(() => {
    const snapshot = captureBodyBrandSnapshot();
    applyBodyBrandBackground({ backgroundColor, clearRootBackground, resetOverflowX });

    return () => {
      restoreBodyBrandBackground(snapshot, { clearRootBackground });
    };
  }, [backgroundColor, clearRootBackground, resetOverflowX]);
}
