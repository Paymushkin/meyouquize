import { PROGRAM_TILE_ID, SPEAKER_TILE_ID } from "../../publicViewContract";

type BannerItem = {
  id: string;
  isVisible: boolean;
  linkUrl: string;
  backgroundUrl: string;
  size: "2x1" | "1x1" | "full";
};

export function getVisiblePlayerBanners(banners: BannerItem[] | undefined): BannerItem[] {
  if (!Array.isArray(banners)) return [];
  return banners.filter((item) => item.isVisible);
}

export function buildPlayerTilesOrder(
  order: string[] | undefined,
  banners: BannerItem[],
): string[] {
  const baseOrder = Array.isArray(order) ? order : [];
  const deduped: string[] = [];
  for (const id of baseOrder) {
    if (!deduped.includes(id)) deduped.push(id);
  }
  for (const b of banners) {
    if (!deduped.includes(b.id)) deduped.push(b.id);
  }
  if (!deduped.includes(SPEAKER_TILE_ID)) deduped.push(SPEAKER_TILE_ID);
  if (!deduped.includes(PROGRAM_TILE_ID)) deduped.push(PROGRAM_TILE_ID);
  return deduped;
}
