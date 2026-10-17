import { AdminBannersSection } from "../../components/admin/AdminBannersSection";
import type { useAdminPlayerTiles } from "../../features/admin/useAdminPlayerTiles";
import type { useAdminPhotoWall } from "../../features/admin/useAdminPhotoWall";
import type { useAdminVideoWall } from "../../features/admin/useAdminVideoWall";

export type AdminEventBannersTabProps = {
  eventName: string;
  playerTiles: ReturnType<typeof useAdminPlayerTiles>;
  photoWall: ReturnType<typeof useAdminPhotoWall>;
  videoWall: ReturnType<typeof useAdminVideoWall>;
  subQuizzesForReport: Array<{ id: string; title: string }>;
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  photoWallCollageSrcs: string[];
  videoWallTileCoverUrl: string;
  uploadBannerMedia: (file: File) => Promise<string>;
  onUploadError: (message: string) => void;
};

export function AdminEventBannersTab({
  eventName,
  playerTiles,
  photoWall,
  videoWall,
  subQuizzesForReport,
  brandPrimaryColor,
  playerVoteOptionTextColor,
  photoWallCollageSrcs,
  videoWallTileCoverUrl,
  uploadBannerMedia,
  onUploadError,
}: AdminEventBannersTabProps) {
  return (
    <AdminBannersSection
      eventName={eventName}
      banners={playerTiles.playerBanners}
      onCreate={playerTiles.createPlayerBanner}
      onUpdate={playerTiles.updatePlayerBanner}
      speakerTileText={playerTiles.speakerTileText}
      speakerTileBackgroundColor={playerTiles.speakerTileBackgroundColor}
      speakerTileTextColor={playerTiles.speakerTileTextColor}
      speakerTileVisible={playerTiles.speakerTileVisible}
      onSaveSpeakerTile={playerTiles.saveSpeakerTile}
      onToggleSpeakerTileVisible={playerTiles.toggleSpeakerTileVisible}
      programTileText={playerTiles.programTileText}
      programTileBackgroundColor={playerTiles.programTileBackgroundColor}
      programTileTextColor={playerTiles.programTileTextColor}
      programTileLinkUrl={playerTiles.programTileLinkUrl}
      programTileVisible={playerTiles.programTileVisible}
      onSaveProgramTile={playerTiles.saveProgramTile}
      onToggleProgramTileVisible={playerTiles.toggleProgramTileVisible}
      playerQuizResultsTileText={playerTiles.playerQuizResultsTileText}
      playerQuizResultsSubQuizIds={playerTiles.playerQuizResultsSubQuizIds}
      subQuizzesForReport={subQuizzesForReport}
      brandPrimaryColor={brandPrimaryColor}
      playerVoteOptionTextColor={playerVoteOptionTextColor}
      photoWallCollageSrcs={photoWallCollageSrcs}
      videoWallTileCoverUrl={videoWallTileCoverUrl}
      playerTilesGridColumns={playerTiles.playerTilesGridColumns}
      onChangePlayerTilesGridColumns={playerTiles.setPlayerTilesGridColumns}
      bannerClickCounts={playerTiles.bannerClickCounts}
      tilesOrder={playerTiles.playerTilesOrder}
      onMoveTileUp={(id) => playerTiles.moveTile(id, -1)}
      onMoveTileDown={(id) => playerTiles.moveTile(id, 1)}
      onUploadMedia={async (file) => {
        try {
          return await uploadBannerMedia(file);
        } catch (error) {
          onUploadError(error instanceof Error ? error.message : "Не удалось загрузить файл");
          throw error;
        }
      }}
      onToggleVisible={playerTiles.togglePlayerBannerVisible}
      photoWallTileVisible={photoWall.tileVisible}
      onTogglePhotoWallTileVisible={(next) => {
        photoWall.setTileVisible(next);
        photoWall.emitSnapshot({ photoWallTileVisible: next });
      }}
      videoWallTileVisible={videoWall.tileVisible}
      onToggleVideoWallTileVisible={(next) => {
        videoWall.setTileVisible(next);
        videoWall.emitSnapshot({ videoWallTileVisible: next });
      }}
      onDelete={playerTiles.deletePlayerBanner}
    />
  );
}
