import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type BannersEditorTab,
  readAdminUiPersistence,
  writeAdminUiBannersTab,
} from "../admin/adminUiPersistence";
import type { PublicBanner } from "../../publicViewContract";
import { buildOrderedTiles } from "./buildOrderedTiles";

type Params = {
  eventName: string;
  banners: PublicBanner[];
  tilesOrder: string[];
  speakerTileText: string;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
  programTileLinkUrl: string;
  playerQuizResultsTileText: string;
  playerQuizResultsSubQuizIds: string[];
  subQuizzesForReport: Array<{ id: string; title: string }>;
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  photoWallCollageSrcs: string[];
  playerTilesGridColumns: 2 | 3;
  onChangePlayerTilesGridColumns: (value: 2 | 3) => void;
  onCreate: (linkUrl: string, backgroundUrl: string, size: "2x1" | "1x1" | "full") => void;
  onUpdate: (
    id: string,
    linkUrl: string,
    backgroundUrl: string,
    size: "2x1" | "1x1" | "full",
  ) => void;
  onUploadMedia: (file: File) => Promise<string>;
  onSaveSpeakerTile: (text: string, backgroundColor: string, textColor: string) => void;
  onSaveProgramTile: (
    text: string,
    backgroundColor: string,
    textColor: string,
    linkUrl: string,
  ) => void;
};

export function useAdminBannersSectionState(params: Params) {
  const {
    eventName,
    banners,
    tilesOrder,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileTextColor,
    programTileText,
    programTileBackgroundColor,
    programTileTextColor,
    programTileLinkUrl,
    playerQuizResultsTileText,
    playerQuizResultsSubQuizIds,
    subQuizzesForReport,
    brandPrimaryColor,
    playerVoteOptionTextColor,
    photoWallCollageSrcs,
    playerTilesGridColumns,
    onChangePlayerTilesGridColumns,
    onCreate,
    onUpdate,
    onUploadMedia,
    onSaveSpeakerTile,
    onSaveProgramTile,
  } = params;
  const [linkUrl, setLinkUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editBackgroundUrl, setEditBackgroundUrl] = useState("");
  const [editSize, setEditSize] = useState<"2x1" | "1x1" | "full">("1x1");
  const [speakerTextDraft, setSpeakerTextDraft] = useState(speakerTileText);
  const [speakerBgColorDraft, setSpeakerBgColorDraft] = useState(speakerTileBackgroundColor);
  const [speakerTextColorDraft, setSpeakerTextColorDraft] = useState(speakerTileTextColor);
  const [programTextDraft, setProgramTextDraft] = useState(programTileText);
  const [programBgColorDraft, setProgramBgColorDraft] = useState(programTileBackgroundColor);
  const [programTextColorDraft, setProgramTextColorDraft] = useState(programTileTextColor);
  const [programLinkUrlDraft, setProgramLinkUrlDraft] = useState(programTileLinkUrl);
  const [editorTab, setEditorTab] = useState<BannersEditorTab>(
    () => readAdminUiPersistence(eventName).bannersTab,
  );

  useEffect(() => {
    if (!eventName) return;
    setEditorTab(readAdminUiPersistence(eventName).bannersTab);
  }, [eventName]);

  useEffect(() => {
    if (!eventName) return;
    writeAdminUiBannersTab(eventName, editorTab);
  }, [eventName, editorTab]);

  useEffect(() => {
    setSpeakerTextDraft(speakerTileText);
  }, [speakerTileText]);
  useEffect(() => {
    setSpeakerBgColorDraft(speakerTileBackgroundColor);
  }, [speakerTileBackgroundColor]);
  useEffect(() => {
    setSpeakerTextColorDraft(speakerTileTextColor);
  }, [speakerTileTextColor]);
  useEffect(() => {
    setProgramTextDraft(programTileText);
  }, [programTileText]);
  useEffect(() => {
    setProgramBgColorDraft(programTileBackgroundColor);
  }, [programTileBackgroundColor]);
  useEffect(() => {
    setProgramTextColorDraft(programTileTextColor);
  }, [programTileTextColor]);
  useEffect(() => {
    setProgramLinkUrlDraft(programTileLinkUrl);
  }, [programTileLinkUrl]);

  const orderedTiles = useMemo(
    () =>
      buildOrderedTiles(
        tilesOrder,
        banners,
        speakerTileText,
        speakerTileBackgroundColor,
        speakerTileTextColor,
        programTileText,
        programTileBackgroundColor,
        programTileTextColor,
        programTileLinkUrl,
        playerQuizResultsTileText,
        playerQuizResultsSubQuizIds,
        subQuizzesForReport,
        brandPrimaryColor,
        playerVoteOptionTextColor,
        photoWallCollageSrcs,
      ),
    [
      tilesOrder,
      banners,
      speakerTileText,
      speakerTileBackgroundColor,
      speakerTileTextColor,
      programTileText,
      programTileBackgroundColor,
      programTileTextColor,
      programTileLinkUrl,
      playerQuizResultsTileText,
      playerQuizResultsSubQuizIds,
      subQuizzesForReport,
      brandPrimaryColor,
      playerVoteOptionTextColor,
      photoWallCollageSrcs,
    ],
  );

  const handleUploadBannerImage = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const uploadedUrl = await onUploadMedia(file);
        setBackgroundUrl(uploadedUrl);
      } finally {
        setUploading(false);
      }
    },
    [onUploadMedia],
  );

  const handleCreateBanner = useCallback(() => {
    onCreate(linkUrl.trim(), backgroundUrl.trim(), "1x1");
    setLinkUrl("");
    setBackgroundUrl("");
  }, [onCreate, linkUrl, backgroundUrl]);

  const handleSaveSpeakerTile = useCallback(() => {
    onSaveSpeakerTile(
      speakerTextDraft.trim(),
      speakerBgColorDraft.trim(),
      speakerTextColorDraft.trim(),
    );
  }, [onSaveSpeakerTile, speakerTextDraft, speakerBgColorDraft, speakerTextColorDraft]);
  const handleSaveProgramTile = useCallback(() => {
    onSaveProgramTile(
      programTextDraft.trim(),
      programBgColorDraft.trim(),
      programTextColorDraft.trim(),
      programLinkUrlDraft.trim(),
    );
  }, [
    onSaveProgramTile,
    programBgColorDraft,
    programLinkUrlDraft,
    programTextColorDraft,
    programTextDraft,
  ]);

  const startEdit = useCallback((banner: PublicBanner) => {
    setEditingId(banner.id);
    setEditLinkUrl(banner.linkUrl);
    setEditBackgroundUrl(banner.backgroundUrl);
    setEditSize(banner.size);
  }, []);

  const cancelEdit = useCallback(() => setEditingId(null), []);
  const saveEdit = useCallback(
    (bannerId: string) => {
      onUpdate(bannerId, editLinkUrl.trim(), editBackgroundUrl.trim(), "1x1");
      setEditingId(null);
    },
    [onUpdate, editLinkUrl, editBackgroundUrl],
  );

  return {
    linkUrl,
    backgroundUrl,
    playerTilesGridColumns,
    onChangePlayerTilesGridColumns,
    uploading,
    setLinkUrl,
    setBackgroundUrl,
    speakerTextDraft,
    speakerBgColorDraft,
    speakerTextColorDraft,
    setSpeakerTextDraft,
    setSpeakerBgColorDraft,
    setSpeakerTextColorDraft,
    programTextDraft,
    programBgColorDraft,
    programTextColorDraft,
    programLinkUrlDraft,
    setProgramTextDraft,
    setProgramBgColorDraft,
    setProgramTextColorDraft,
    setProgramLinkUrlDraft,
    editorTab,
    setEditorTab,
    orderedTiles,
    editingId,
    editLinkUrl,
    editBackgroundUrl,
    editSize,
    setEditLinkUrl,
    setEditBackgroundUrl,
    setEditSize,
    handleUploadBannerImage,
    handleCreateBanner,
    handleSaveSpeakerTile,
    handleSaveProgramTile,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
