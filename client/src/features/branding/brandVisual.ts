type BrandVisualInput = {
  backgroundImageUrl?: string;
  /** При cover: bottom — обрезать сверху, center — по центру (по умолчанию). */
  backgroundAnchor?: "center" | "bottom";
  backgroundAttachment?: "scroll" | "fixed";
};

function hexToRgba(hex: string, alpha: number): string {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function buildBrandBackground(input: BrandVisualInput): {
  backgroundImage: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundAttachment?: string;
} {
  const hasImage = !!input.backgroundImageUrl?.trim();
  const imagePosition = input.backgroundAnchor === "bottom" ? "center bottom" : "center";
  const attachment =
    input.backgroundAttachment === "fixed" && hasImage ? "fixed, fixed" : undefined;
  if (!hasImage) {
    return {
      backgroundImage: "none",
      backgroundSize: "auto",
      backgroundPosition: "center",
    };
  }
  const overlay = `linear-gradient(${hexToRgba("#000000", 0.25)}, ${hexToRgba("#000000", 0.25)})`;
  const layers: string[] = [overlay];
  if (input.backgroundImageUrl?.trim()) {
    layers.push(`url("${input.backgroundImageUrl.trim()}")`);
  }
  return {
    backgroundImage: layers.join(", "),
    backgroundSize: "auto, cover",
    backgroundPosition: `center, ${imagePosition}`,
    ...(attachment ? { backgroundAttachment: attachment } : {}),
  };
}
