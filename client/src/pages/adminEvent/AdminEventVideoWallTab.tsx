import {
  clampVideoWallProjectorActiveSeconds,
  clampVideoWallProjectorFreezeSeconds,
  sanitizeVideoWallItems,
  sanitizeVideoWallPosterUrl,
} from "@meyouquize/shared";
import { AdminVideoWallSection } from "../../components/admin/AdminVideoWallSection";
import type { useAdminVideoWall } from "../../features/admin/useAdminVideoWall";
import type { PublicViewMode } from "../../publicViewContract";

export type AdminEventVideoWallTabProps = {
  publicViewMode: PublicViewMode;
  uploadMedia: (file: File) => Promise<string>;
  onUploadError: (message: string) => void;
} & ReturnType<typeof useAdminVideoWall>;

export function AdminEventVideoWallTab({
  publicViewMode,
  uploadMedia,
  onUploadError,
  horizontalItems,
  verticalItems,
  horizontalPosterUrl,
  verticalPosterUrl,
  tileCoverUrl,
  tileVisible,
  projectorShowHorizontal,
  projectorShowVertical,
  projectorActiveSeconds,
  projectorFreezeSeconds,
  setHorizontalItems,
  setVerticalItems,
  setHorizontalPosterUrl,
  setVerticalPosterUrl,
  setTileCoverUrl,
  setTileVisible,
  setProjectorShowHorizontal,
  setProjectorShowVertical,
  setProjectorActiveSeconds,
  setProjectorFreezeSeconds,
  emitSnapshot,
  showOnProjector,
  hideFromProjector,
}: AdminEventVideoWallTabProps) {
  return (
    <AdminVideoWallSection
      horizontalItems={horizontalItems}
      verticalItems={verticalItems}
      horizontalPosterUrl={horizontalPosterUrl}
      verticalPosterUrl={verticalPosterUrl}
      tileCoverUrl={tileCoverUrl}
      tileVisible={tileVisible}
      projectorMode={publicViewMode === "video_wall"}
      projectorShowHorizontal={projectorShowHorizontal}
      projectorShowVertical={projectorShowVertical}
      projectorActiveSeconds={projectorActiveSeconds}
      projectorFreezeSeconds={projectorFreezeSeconds}
      onHorizontalItemsChange={(items) => {
        setHorizontalItems(items);
        emitSnapshot({ videoWallHorizontalItems: sanitizeVideoWallItems(items) });
      }}
      onVerticalItemsChange={(items) => {
        setVerticalItems(items);
        emitSnapshot({ videoWallVerticalItems: sanitizeVideoWallItems(items) });
      }}
      onHorizontalPosterUrlChange={(value) => {
        setHorizontalPosterUrl(value);
        emitSnapshot({ videoWallHorizontalPosterUrl: sanitizeVideoWallPosterUrl(value) });
      }}
      onVerticalPosterUrlChange={(value) => {
        setVerticalPosterUrl(value);
        emitSnapshot({ videoWallVerticalPosterUrl: sanitizeVideoWallPosterUrl(value) });
      }}
      onTileCoverUrlChange={(value) => {
        setTileCoverUrl(value);
        emitSnapshot({ videoWallTileCoverUrl: sanitizeVideoWallPosterUrl(value) });
      }}
      onCommit={() => emitSnapshot()}
      onTileVisibleChange={(next) => {
        setTileVisible(next);
        emitSnapshot({ videoWallTileVisible: next });
      }}
      onProjectorShowHorizontalChange={(next) => {
        setProjectorShowHorizontal(next);
        emitSnapshot({ videoWallProjectorShowHorizontal: next });
      }}
      onProjectorShowVerticalChange={(next) => {
        setProjectorShowVertical(next);
        emitSnapshot({ videoWallProjectorShowVertical: next });
      }}
      onProjectorActiveSecondsChange={(next) => {
        const safe = clampVideoWallProjectorActiveSeconds(next);
        setProjectorActiveSeconds(safe);
        emitSnapshot({ videoWallProjectorActiveSeconds: safe });
      }}
      onProjectorFreezeSecondsChange={(next) => {
        const safe = clampVideoWallProjectorFreezeSeconds(next);
        setProjectorFreezeSeconds(safe);
        emitSnapshot({ videoWallProjectorFreezeSeconds: safe });
      }}
      onToggleProjector={() => {
        if (publicViewMode === "video_wall") {
          hideFromProjector();
          return;
        }
        showOnProjector();
      }}
      onUploadMedia={uploadMedia}
      onUploadError={onUploadError}
    />
  );
}
