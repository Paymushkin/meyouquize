import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicBanner } from "../../publicViewContract";
import { buildOrderedTiles } from "./buildOrderedTiles";

type Params = {
  banners: PublicBanner[];
  tilesOrder: string[];
  speakerTileText: string;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
  programTileLinkUrl: string;
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
    banners,
    tilesOrder,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileTextColor,
    programTileText,
    programTileBackgroundColor,
    programTileTextColor,
    programTileLinkUrl,
    onCreate,
    onUpdate,
    onUploadMedia,
    onSaveSpeakerTile,
    onSaveProgramTile,
  } = params;
  const [linkUrl, setLinkUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [size, setSize] = useState<"2x1" | "1x1" | "full">("2x1");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editBackgroundUrl, setEditBackgroundUrl] = useState("");
  const [editSize, setEditSize] = useState<"2x1" | "1x1" | "full">("2x1");
  const [speakerTextDraft, setSpeakerTextDraft] = useState(speakerTileText);
  const [speakerBgColorDraft, setSpeakerBgColorDraft] = useState(speakerTileBackgroundColor);
  const [speakerTextColorDraft, setSpeakerTextColorDraft] = useState(speakerTileTextColor);
  const [programTextDraft, setProgramTextDraft] = useState(programTileText);
  const [programBgColorDraft, setProgramBgColorDraft] = useState(programTileBackgroundColor);
  const [programTextColorDraft, setProgramTextColorDraft] = useState(programTileTextColor);
  const [programLinkUrlDraft, setProgramLinkUrlDraft] = useState(programTileLinkUrl);
  const [editorTab, setEditorTab] = useState<"banner" | "speaker" | "program">("banner");

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
    onCreate(linkUrl.trim(), backgroundUrl.trim(), size);
    setLinkUrl("");
    setBackgroundUrl("");
    setSize("2x1");
  }, [onCreate, linkUrl, backgroundUrl, size]);

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
      onUpdate(bannerId, editLinkUrl.trim(), editBackgroundUrl.trim(), editSize);
      setEditingId(null);
    },
    [onUpdate, editLinkUrl, editBackgroundUrl, editSize],
  );

  return {
    linkUrl,
    backgroundUrl,
    size,
    uploading,
    setLinkUrl,
    setBackgroundUrl,
    setSize,
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
