/** Совпадает с темой админки: palette.primary / background.default */
export const ADMIN_DEFAULT_PROJECTOR_BACKGROUND = "#7c5acb";

/** Как в client/src/main.tsx — точечный паттерн по фону */
export const ADMIN_PROJECTOR_BACKGROUND_IMAGE = `
            radial-gradient(circle at 88% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px)
          `.trim();

export function isAdminDefaultProjectorBackground(hex: string): boolean {
  const a = hex.trim().replace("#", "").toLowerCase();
  const b = ADMIN_DEFAULT_PROJECTOR_BACKGROUND.replace("#", "").toLowerCase();
  return a === b;
}
