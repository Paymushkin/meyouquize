import {
  normalizePublicViewState,
  type PhotoWallImageExt,
  type PublicViewPayload,
} from "@meyouquize/shared";
import { useCallback, useState } from "react";
import type { PublicViewSetPatch } from "../../publicViewContract";

type EmitPatch = (patch: PublicViewSetPatch) => void;

type Params = {
  emitPublicViewPatch: EmitPatch;
};

export function useAdminPhotoWall({ emitPublicViewPatch }: Params) {
  const [baseUrl, setBaseUrl] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const [imageExt, setImageExt] = useState<PhotoWallImageExt>("jpg");
  const [gridColumns, setGridColumns] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [kenBurns, setKenBurns] = useState(true);
  const [tileVisible, setTileVisible] = useState(false);

  const applyFromPublicView = useCallback((payload: PublicViewPayload) => {
    const view = normalizePublicViewState(payload);
    setBaseUrl(view.photoWallBaseUrl);
    setImageCount(view.photoWallImageCount);
    setImageExt(view.photoWallImageExt);
    setGridColumns(view.photoWallGridColumns);
    setAnimate(view.photoWallAnimate);
    setKenBurns(view.photoWallKenBurns);
    setTileVisible(view.photoWallTileVisible);
  }, []);

  const emitSnapshot = useCallback(
    (patch: PublicViewSetPatch = {}) => {
      emitPublicViewPatch({
        photoWallBaseUrl: baseUrl,
        photoWallImageCount: imageCount,
        photoWallImageExt: imageExt,
        photoWallGridColumns: gridColumns,
        photoWallAnimate: animate,
        photoWallKenBurns: kenBurns,
        photoWallTileVisible: tileVisible,
        ...patch,
      });
    },
    [
      animate,
      baseUrl,
      emitPublicViewPatch,
      gridColumns,
      imageCount,
      imageExt,
      kenBurns,
      tileVisible,
    ],
  );

  return {
    baseUrl,
    setBaseUrl,
    imageCount,
    setImageCount,
    imageExt,
    setImageExt,
    gridColumns,
    setGridColumns,
    animate,
    setAnimate,
    kenBurns,
    setKenBurns,
    tileVisible,
    setTileVisible,
    applyFromPublicView,
    emitSnapshot,
  };
}
