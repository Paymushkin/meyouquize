import { useEffect } from "react";
import { absoluteUrl, LANDING_SEO, type DocumentSeoInput } from "./landingSeo";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** SEO meta + Open Graph + JSON-LD для brand-страниц. */
export function DocumentSeo({
  title,
  description,
  path = "/",
  imagePath = LANDING_SEO.ogImagePath,
  noIndex = false,
  jsonLd,
}: DocumentSeoInput) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const canonical = absoluteUrl(path);
    const image = absoluteUrl(imagePath);

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", LANDING_SEO.keywords);
    upsertMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    upsertMeta("name", "theme-color", "#000000");
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:type", path === "/" ? "website" : "article");
    upsertMeta("property", "og:locale", LANDING_SEO.locale);
    upsertMeta("property", "og:site_name", "МИЮ (MeYou)");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", title);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    if (jsonLd) {
      upsertJsonLd("miyu-jsonld", Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
    }

    return () => {
      document.title = previousTitle;
    };
    // jsonLd сериализуем, чтобы не перезапускать эффект на каждый новый object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, imagePath, noIndex, JSON.stringify(jsonLd ?? null)]);

  return null;
}
