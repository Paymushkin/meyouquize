import { useEffect } from "react";

/** Синхронизирует фон `document.body` и `#root` только с цветом проектора. */
export function useProjectorBodyBackground(
  projectorBackground: string,
  hasBrandBackgroundImage: boolean,
) {
  useEffect(() => {
    const root = document.getElementById("root");
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyImg = document.body.style.backgroundImage;
    const prevBodyAtt = document.body.style.backgroundAttachment;
    const prevBodyOx = document.body.style.overflowX;
    const prevRootBg = root?.style.backgroundColor ?? "";
    const hadAdminClass = document.body.classList.contains("mq-admin-projector-bg");

    document.body.style.backgroundColor = projectorBackground;
    document.body.style.backgroundImage = hasBrandBackgroundImage ? "none" : "";
    document.body.style.backgroundAttachment = "";
    document.body.style.overflowX = "";
    if (hasBrandBackgroundImage) document.body.classList.add("mq-projector-brand-bg");
    else document.body.classList.remove("mq-projector-brand-bg");
    document.body.classList.remove("mq-admin-projector-bg");
    if (root) root.style.backgroundColor = "transparent";

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.backgroundImage = prevBodyImg;
      document.body.style.backgroundAttachment = prevBodyAtt;
      document.body.style.overflowX = prevBodyOx;
      document.body.classList.remove("mq-projector-brand-bg");
      if (root) root.style.backgroundColor = prevRootBg;
      if (hadAdminClass) document.body.classList.add("mq-admin-projector-bg");
      else document.body.classList.remove("mq-admin-projector-bg");
    };
  }, [projectorBackground, hasBrandBackgroundImage]);
}
