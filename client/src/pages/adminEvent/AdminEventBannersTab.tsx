import { AdminBannersSection } from "../../components/admin/AdminBannersSection";
import type { useAdminPlayerTiles } from "../../features/admin/useAdminPlayerTiles";

export type AdminEventBannersTabProps = {
  eventName: string;
  playerTiles: ReturnType<typeof useAdminPlayerTiles>;
  subQuizzesForReport: Array<{ id: string; title: string }>;
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  photoWallCollageSrcs: string[];
  uploadBannerMedia: (file: File) => Promise<string>;
  onUploadError: (message: string) => void;
};

export function AdminEventBannersTab({
  eventName,
  playerTiles,
  subQuizzesForReport,
  brandPrimaryColor,
  playerVoteOptionTextColor,
  photoWallCollageSrcs,
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
      onDelete={playerTiles.deletePlayerBanner}
    />
  );
}
