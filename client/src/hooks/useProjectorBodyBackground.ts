import { useEffect } from "react";

/** Синхронизирует фон `document.body` с цветом «Фон проектора», без декоративного паттерна админки. */
export function useProjectorBodyBackground(projectorBackground: string) {
  useEffect(() => {
    const root = document.getElementById("root");
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyImg = document.body.style.backgroundImage;
    const prevBodyAtt = document.body.style.backgroundAttachment;
    const prevBodyOx = document.body.style.overflowX;
    const prevRootBg = root?.style.backgroundColor ?? "";
    const hadProjectorClass = document.body.classList.contains("mq-projector-body-bg");
    const hadLegacyProjectorClass = document.body.classList.contains("mq-projector-brand-bg");

    document.body.style.backgroundColor = projectorBackground;
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundAttachment = "";
    document.body.style.overflowX = "";
    document.body.classList.add("mq-projector-body-bg");
    document.body.classList.remove("mq-projector-brand-bg", "mq-admin-projector-bg");
    if (root) root.style.backgroundColor = "transparent";

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.backgroundImage = prevBodyImg;
      document.body.style.backgroundAttachment = prevBodyAtt;
      document.body.style.overflowX = prevBodyOx;
      if (root) root.style.backgroundColor = prevRootBg;
      if (hadProjectorClass) document.body.classList.add("mq-projector-body-bg");
      else document.body.classList.remove("mq-projector-body-bg");
      if (hadLegacyProjectorClass) document.body.classList.add("mq-projector-brand-bg");
      else document.body.classList.remove("mq-projector-brand-bg");
    };
  }, [projectorBackground]);
}
