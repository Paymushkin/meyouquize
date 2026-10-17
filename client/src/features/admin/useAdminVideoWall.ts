import {
  clampVideoWallProjectorActiveSeconds,
  clampVideoWallProjectorFreezeSeconds,
  clampVideoWallProjectorMaxVideos,
  normalizePublicViewState,
  sanitizeVideoWallItems,
  sanitizeVideoWallPosterUrl,
  type PublicViewPayload,
  type VideoWallItem,
} from "@meyouquize/shared";
import { useCallback, useState } from "react";
import type { PublicViewSetPatch } from "../../publicViewContract";

type EmitPatch = (patch: PublicViewSetPatch) => void;

type SetPublicResultsView = (
  mode:
    | "title"
    | "question"
    | "leaderboard"
    | "speaker_questions"
    | "reactions"
    | "randomizer"
    | "photo_wall"
    | "video_wall",
  questionId?: string,
  patch?: PublicViewSetPatch,
) => void;

type Params = {
  emitPublicViewPatch: EmitPatch;
  setPublicResultsView: SetPublicResultsView;
};

function newItemId(): string {
  return `vw_${Math.random().toString(36).slice(2, 10)}`;
}

export function useAdminVideoWall({ emitPublicViewPatch, setPublicResultsView }: Params) {
  const [horizontalItems, setHorizontalItems] = useState<VideoWallItem[]>([]);
  const [verticalItems, setVerticalItems] = useState<VideoWallItem[]>([]);
  const [horizontalPosterUrl, setHorizontalPosterUrl] = useState("");
  const [verticalPosterUrl, setVerticalPosterUrl] = useState("");
  const [tileCoverUrl, setTileCoverUrl] = useState("");
  const [tileVisible, setTileVisible] = useState(false);
  const [projectorShowHorizontal, setProjectorShowHorizontal] = useState(true);
  const [projectorShowVertical, setProjectorShowVertical] = useState(true);
  const [projectorMaxVideos, setProjectorMaxVideos] = useState(12);
  const [projectorActiveSeconds, setProjectorActiveSeconds] = useState(8);
  const [projectorFreezeSeconds, setProjectorFreezeSeconds] = useState(10);

  const applyFromPublicView = useCallback((payload: PublicViewPayload) => {
    const view = normalizePublicViewState(payload);
    setHorizontalItems(view.videoWallHorizontalItems);
    setVerticalItems(view.videoWallVerticalItems);
    setHorizontalPosterUrl(view.videoWallHorizontalPosterUrl);
    setVerticalPosterUrl(view.videoWallVerticalPosterUrl);
    setTileCoverUrl(view.videoWallTileCoverUrl);
    setTileVisible(view.videoWallTileVisible);
    setProjectorShowHorizontal(view.videoWallProjectorShowHorizontal);
    setProjectorShowVertical(view.videoWallProjectorShowVertical);
    setProjectorMaxVideos(view.videoWallProjectorMaxVideos);
    setProjectorActiveSeconds(view.videoWallProjectorActiveSeconds);
    setProjectorFreezeSeconds(view.videoWallProjectorFreezeSeconds);
  }, []);

  const emitSnapshot = useCallback(
    (patch: PublicViewSetPatch = {}) => {
      emitPublicViewPatch({
        videoWallHorizontalItems: sanitizeVideoWallItems(horizontalItems),
        videoWallHorizontalPosterUrl: sanitizeVideoWallPosterUrl(horizontalPosterUrl),
        videoWallVerticalItems: sanitizeVideoWallItems(verticalItems),
        videoWallVerticalPosterUrl: sanitizeVideoWallPosterUrl(verticalPosterUrl),
        videoWallTileCoverUrl: sanitizeVideoWallPosterUrl(tileCoverUrl),
        videoWallTileVisible: tileVisible,
        videoWallProjectorShowHorizontal: projectorShowHorizontal,
        videoWallProjectorShowVertical: projectorShowVertical,
        videoWallProjectorMaxVideos: clampVideoWallProjectorMaxVideos(projectorMaxVideos),
        videoWallProjectorActiveSeconds:
          clampVideoWallProjectorActiveSeconds(projectorActiveSeconds),
        videoWallProjectorFreezeSeconds:
          clampVideoWallProjectorFreezeSeconds(projectorFreezeSeconds),
        ...patch,
      });
    },
    [
      emitPublicViewPatch,
      horizontalItems,
      horizontalPosterUrl,
      projectorActiveSeconds,
      projectorFreezeSeconds,
      projectorMaxVideos,
      projectorShowHorizontal,
      projectorShowVertical,
      tileCoverUrl,
      tileVisible,
      verticalItems,
      verticalPosterUrl,
    ],
  );

  const showOnProjector = useCallback(() => {
    setPublicResultsView("video_wall", undefined, {
      videoWallHorizontalItems: sanitizeVideoWallItems(horizontalItems),
      videoWallHorizontalPosterUrl: sanitizeVideoWallPosterUrl(horizontalPosterUrl),
      videoWallVerticalItems: sanitizeVideoWallItems(verticalItems),
      videoWallVerticalPosterUrl: sanitizeVideoWallPosterUrl(verticalPosterUrl),
      videoWallProjectorShowHorizontal: projectorShowHorizontal,
      videoWallProjectorShowVertical: projectorShowVertical,
      videoWallProjectorMaxVideos: clampVideoWallProjectorMaxVideos(projectorMaxVideos),
      videoWallProjectorActiveSeconds: clampVideoWallProjectorActiveSeconds(projectorActiveSeconds),
      videoWallProjectorFreezeSeconds: clampVideoWallProjectorFreezeSeconds(projectorFreezeSeconds),
    });
  }, [
    horizontalItems,
    horizontalPosterUrl,
    projectorActiveSeconds,
    projectorFreezeSeconds,
    projectorMaxVideos,
    projectorShowHorizontal,
    projectorShowVertical,
    setPublicResultsView,
    verticalItems,
    verticalPosterUrl,
  ]);

  const hideFromProjector = useCallback(() => {
    setPublicResultsView("title");
  }, [setPublicResultsView]);

  const addHorizontalItem = useCallback(() => {
    setHorizontalItems((prev) => [
      ...prev,
      { id: newItemId(), url: "", title: `Видео ${prev.length + 1}` },
    ]);
  }, []);

  const addVerticalItem = useCallback(() => {
    setVerticalItems((prev) => [
      ...prev,
      { id: newItemId(), url: "", title: `Видео ${prev.length + 1}` },
    ]);
  }, []);

  return {
    horizontalItems,
    setHorizontalItems,
    verticalItems,
    setVerticalItems,
    horizontalPosterUrl,
    setHorizontalPosterUrl,
    verticalPosterUrl,
    setVerticalPosterUrl,
    tileCoverUrl,
    setTileCoverUrl,
    addHorizontalItem,
    addVerticalItem,
    tileVisible,
    setTileVisible,
    projectorShowHorizontal,
    setProjectorShowHorizontal,
    projectorShowVertical,
    setProjectorShowVertical,
    projectorMaxVideos,
    setProjectorMaxVideos,
    projectorActiveSeconds,
    setProjectorActiveSeconds,
    projectorFreezeSeconds,
    setProjectorFreezeSeconds,
    applyFromPublicView,
    emitSnapshot,
    showOnProjector,
    hideFromProjector,
  };
}
