import { AdminPhotoWallSection } from "../../components/admin/AdminPhotoWallSection";
import type { useAdminPhotoWall } from "../../features/admin/useAdminPhotoWall";
import type { PublicViewMode } from "../../publicViewContract";

export type AdminEventPhotoWallTabProps = {
  publicViewMode: PublicViewMode;
} & ReturnType<typeof useAdminPhotoWall>;

export function AdminEventPhotoWallTab({
  publicViewMode,
  baseUrl,
  imageCount,
  imageExt,
  gridColumns,
  animate,
  kenBurns,
  tileVisible,
  setBaseUrl,
  setImageCount,
  setImageExt,
  setGridColumns,
  setAnimate,
  setKenBurns,
  setTileVisible,
  emitSnapshot,
  showOnProjector,
  hideFromProjector,
}: AdminEventPhotoWallTabProps) {
  return (
    <>
      <AdminPhotoWallSection
        baseUrl={baseUrl}
        imageCount={imageCount}
        imageExt={imageExt}
        gridColumns={gridColumns}
        animate={animate}
        kenBurns={kenBurns}
        tileVisible={tileVisible}
        projectorMode={publicViewMode === "photo_wall"}
        onBaseUrlChange={setBaseUrl}
        onBaseUrlCommit={() => emitSnapshot()}
        onImageCountChange={setImageCount}
        onImageCountCommit={() => emitSnapshot()}
        onImageExtChange={(next) => {
          setImageExt(next);
          emitSnapshot({ photoWallImageExt: next });
        }}
        onGridColumnsChange={setGridColumns}
        onGridColumnsCommit={() => emitSnapshot()}
        onAnimateChange={(next) => {
          setAnimate(next);
          emitSnapshot({ photoWallAnimate: next });
        }}
        onKenBurnsChange={(next) => {
          setKenBurns(next);
          emitSnapshot({ photoWallKenBurns: next });
        }}
        onTileVisibleChange={(next) => {
          setTileVisible(next);
          emitSnapshot({ photoWallTileVisible: next });
        }}
        onToggleProjector={() => {
          if (publicViewMode === "photo_wall") {
            hideFromProjector();
            return;
          }
          showOnProjector();
        }}
      />
    </>
  );
}
