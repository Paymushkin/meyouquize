import { Tab, Tabs, Card, CardContent, Stack } from "@mui/material";
import type { PublicBanner } from "../../publicViewContract";
import { useAdminBannersSectionState } from "../../features/adminBanners/useAdminBannersSectionState";
import { BannerCreateTab } from "./banners/BannerCreateTab";
import { ProgramTileTab } from "./banners/ProgramTileTab";
import { SpeakerTileTab } from "./banners/SpeakerTileTab";
import { TilesOrderList } from "./banners/TilesOrderList";

type Props = {
  banners: PublicBanner[];
  onCreate: (linkUrl: string, backgroundUrl: string, size: "2x1" | "1x1" | "full") => void;
  onUpdate: (
    id: string,
    linkUrl: string,
    backgroundUrl: string,
    size: "2x1" | "1x1" | "full",
  ) => void;
  onUploadMedia: (file: File) => Promise<string>;
  speakerTileText: string;
  speakerTileBackgroundColor: string;
  speakerTileVisible: boolean;
  onSaveSpeakerTile: (text: string, backgroundColor: string) => void;
  onToggleSpeakerTileVisible: (
    next: boolean,
    payload: { text: string; backgroundColor: string },
  ) => void;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileLinkUrl: string;
  programTileVisible: boolean;
  onSaveProgramTile: (text: string, backgroundColor: string, linkUrl: string) => void;
  onToggleProgramTileVisible: (
    next: boolean,
    payload: { text: string; backgroundColor: string; linkUrl: string },
  ) => void;
  tilesOrder: string[];
  onMoveTileUp: (id: string) => void;
  onMoveTileDown: (id: string) => void;
  onToggleVisible: (bannerId: string, next: boolean) => void;
  onDelete: (bannerId: string) => void;
};

export function AdminBannersSection({
  banners,
  onCreate,
  onUpdate,
  onUploadMedia,
  speakerTileText,
  speakerTileBackgroundColor,
  speakerTileVisible,
  onSaveSpeakerTile,
  onToggleSpeakerTileVisible,
  programTileText,
  programTileBackgroundColor,
  programTileLinkUrl,
  programTileVisible,
  onSaveProgramTile,
  onToggleProgramTileVisible,
  tilesOrder,
  onMoveTileUp,
  onMoveTileDown,
  onToggleVisible,
  onDelete,
}: Props) {
  const state = useAdminBannersSectionState({
    banners,
    tilesOrder,
    speakerTileText,
    speakerTileBackgroundColor,
    programTileText,
    programTileBackgroundColor,
    programTileLinkUrl,
    onCreate,
    onUpdate,
    onUploadMedia,
    onSaveSpeakerTile,
    onSaveProgramTile,
  });

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.25}>
            <Tabs
              value={state.editorTab}
              onChange={(_, v) => state.setEditorTab(v)}
              sx={{ minHeight: 0 }}
            >
              <Tab value="banner" label="Баннер" />
              <Tab value="speaker" label="Плитка спикеров" />
              <Tab value="program" label="Кнопка программы" />
            </Tabs>
            {state.editorTab === "banner" ? (
              <BannerCreateTab
                linkUrl={state.linkUrl}
                backgroundUrl={state.backgroundUrl}
                size={state.size}
                uploading={state.uploading}
                onChangeLinkUrl={state.setLinkUrl}
                onChangeBackgroundUrl={state.setBackgroundUrl}
                onChangeSize={state.setSize}
                onUpload={state.handleUploadBannerImage}
                onCreate={state.handleCreateBanner}
              />
            ) : state.editorTab === "speaker" ? (
              <SpeakerTileTab
                text={state.speakerTextDraft}
                backgroundColor={state.speakerBgColorDraft}
                visible={speakerTileVisible}
                onChangeText={state.setSpeakerTextDraft}
                onChangeBackgroundColor={state.setSpeakerBgColorDraft}
                onSave={state.handleSaveSpeakerTile}
                onToggleVisible={onToggleSpeakerTileVisible}
              />
            ) : (
              <ProgramTileTab
                text={state.programTextDraft}
                backgroundColor={state.programBgColorDraft}
                linkUrl={state.programLinkUrlDraft}
                visible={programTileVisible}
                onChangeText={state.setProgramTextDraft}
                onChangeBackgroundColor={state.setProgramBgColorDraft}
                onChangeLinkUrl={state.setProgramLinkUrlDraft}
                onSave={state.handleSaveProgramTile}
                onToggleVisible={onToggleProgramTileVisible}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      <TilesOrderList
        tiles={state.orderedTiles}
        editor={{
          editingId: state.editingId,
          editLinkUrl: state.editLinkUrl,
          editBackgroundUrl: state.editBackgroundUrl,
          editSize: state.editSize,
        }}
        onMoveUp={onMoveTileUp}
        onMoveDown={onMoveTileDown}
        onToggleBannerVisible={onToggleVisible}
        onDeleteBanner={onDelete}
        onStartEdit={(tile) => state.startEdit(tile.banner)}
        onCancelEdit={state.cancelEdit}
        onSaveEdit={state.saveEdit}
        onChangeEditLinkUrl={state.setEditLinkUrl}
        onChangeEditBackgroundUrl={state.setEditBackgroundUrl}
        onChangeEditSize={state.setEditSize}
      />
    </Stack>
  );
}
