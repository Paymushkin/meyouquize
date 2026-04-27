import { useEffect } from "react";

function ensureFaviconLink(): HTMLLinkElement {
  const existing = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (existing) return existing;
  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  return link;
}

export function useEventFavicon(faviconUrl?: string) {
  useEffect(() => {
    const next = faviconUrl?.trim();
    if (!next) return;
    const link = ensureFaviconLink();
    const prevHref = link.getAttribute("href");
    link.setAttribute("href", next);
    return () => {
      if (prevHref) link.setAttribute("href", prevHref);
    };
  }, [faviconUrl]);
}
