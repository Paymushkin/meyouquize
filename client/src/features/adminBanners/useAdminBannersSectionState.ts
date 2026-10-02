import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type BannersEditorTab,
  readAdminUiPersistence,
  writeAdminUiBannersTab,
} from "../admin/adminUiPersistence";
import type { PublicBanner } from "../../publicViewContract";
import { buildOrderedTiles } from "./buildOrderedTiles";

type BannerWriteInput = {
  linkUrl: string;
  backgroundUrl?: string;
  size?: "2x1" | "1x1" | "full";
  visualStyle?: "image" | "tile";
  text?: string;
  backgroundColor?: string;
  textColor?: string;
};

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
  onCreate: (input: BannerWriteInput) => void;
  onUpdate: (id: string, input: BannerWriteInput) => void;
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
  const [visualStyle, setVisualStyle] = useState<"image" | "tile">("image");
  const [tileText, setTileText] = useState("Баннер");
  const [tileBackgroundColor, setTileBackgroundColor] = useState("#1976d2");
  const [tileTextColor, setTileTextColor] = useState("#ffffff");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editBackgroundUrl, setEditBackgroundUrl] = useState("");
  const [editVisualStyle, setEditVisualStyle] = useState<"image" | "tile">("image");
  const [editTileText, setEditTileText] = useState("Баннер");
  const [editTileBackgroundColor, setEditTileBackgroundColor] = useState("#1976d2");
  const [editTileTextColor, setEditTileTextColor] = useState("#ffffff");
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

  const handleUploadEditBannerImage = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const uploadedUrl = await onUploadMedia(file);
        setEditBackgroundUrl(uploadedUrl);
      } finally {
        setUploading(false);
      }
    },
    [onUploadMedia],
  );

  const handleCreateBanner = useCallback(() => {
    if (visualStyle === "tile") {
      onCreate({
        linkUrl: linkUrl.trim(),
        visualStyle: "tile",
        text: tileText.trim() || "Баннер",
        backgroundColor: tileBackgroundColor.trim() || "#1976d2",
        textColor: tileTextColor.trim() || "#ffffff",
        size: "full",
      });
    } else {
      onCreate({
        linkUrl: linkUrl.trim(),
        backgroundUrl: backgroundUrl.trim(),
        size: "1x1",
        visualStyle: "image",
      });
    }
    setLinkUrl("");
    setBackgroundUrl("");
    setTileText("Баннер");
    setTileBackgroundColor("#1976d2");
    setTileTextColor("#ffffff");
  }, [onCreate, linkUrl, backgroundUrl, visualStyle, tileText, tileBackgroundColor, tileTextColor]);

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
    const style = banner.visualStyle === "tile" ? "tile" : "image";
    setEditVisualStyle(style);
    setEditTileText(banner.text?.trim() || "Баннер");
    setEditTileBackgroundColor(banner.backgroundColor?.trim() || "#1976d2");
    setEditTileTextColor(banner.textColor?.trim() || "#ffffff");
  }, []);

  const cancelEdit = useCallback(() => setEditingId(null), []);
  const saveEdit = useCallback(
    (bannerId: string) => {
      if (editVisualStyle === "tile") {
        onUpdate(bannerId, {
          linkUrl: editLinkUrl.trim(),
          visualStyle: "tile",
          text: editTileText.trim() || "Баннер",
          backgroundColor: editTileBackgroundColor.trim() || "#1976d2",
          textColor: editTileTextColor.trim() || "#ffffff",
          size: "full",
        });
      } else {
        onUpdate(bannerId, {
          linkUrl: editLinkUrl.trim(),
          backgroundUrl: editBackgroundUrl.trim(),
          size: "1x1",
          visualStyle: "image",
        });
      }
      setEditingId(null);
    },
    [
      onUpdate,
      editLinkUrl,
      editBackgroundUrl,
      editVisualStyle,
      editTileText,
      editTileBackgroundColor,
      editTileTextColor,
    ],
  );

  return {
    linkUrl,
    backgroundUrl,
    visualStyle,
    tileText,
    tileBackgroundColor,
    tileTextColor,
    playerTilesGridColumns,
    onChangePlayerTilesGridColumns,
    uploading,
    setLinkUrl,
    setBackgroundUrl,
    setVisualStyle,
    setTileText,
    setTileBackgroundColor,
    setTileTextColor,
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
    editVisualStyle,
    editTileText,
    editTileBackgroundColor,
    editTileTextColor,
    editSize,
    setEditLinkUrl,
    setEditBackgroundUrl,
    setEditVisualStyle,
    setEditTileText,
    setEditTileBackgroundColor,
    setEditTileTextColor,
    setEditSize,
    handleUploadBannerImage,
    handleUploadEditBannerImage,
    handleCreateBanner,
    handleSaveSpeakerTile,
    handleSaveProgramTile,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
