import {
  buildPhotoWallAlbumPhotos,
  buildPhotoWallWaterfallColumnPhotos,
  photoWallKenBurnsVariant,
  photoWallPickInsertPhotoIndex,
  photoWallSlotPhotoIndex,
  photoWallWaterfallScrollDurationSec,
  PHOTO_WALL_INSERT_DURATION_MS,
  PHOTO_WALL_INSERT_INTERVAL_MS,
  PHOTO_WALL_INSERT_RETRY_MS,
  resolvePhotoWallColumnCount,
  type PhotoWallAlbumPhoto,
  type PublicViewState,
} from "@meyouquize/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { Box, Stack, Typography } from "@mui/material";
import "./photoWallAnimations.css";

type Props = {
  view: PublicViewState;
};

type TilePhoto = PhotoWallAlbumPhoto & { alt: string };

type ColumnTile = {
  id: string;
  photoIndex: number;
};

const INSERT_VIEWPORT_EDGE_RATIO = 0.2;

type CenterZoneTile = {
  tileKey: string;
  logicalIndex: number;
  centerDistance: number;
};

type ColumnInsertApi = {
  tryInsertVisible: () => boolean;
  isInserting: () => boolean;
};

type PhotoWallInsertContextValue = {
  insertPhotos: boolean;
  registerColumn: (columnIndex: number, api: ColumnInsertApi | null) => void;
  notifyInsertStart: () => void;
  notifyInsertEnd: () => void;
};

const PhotoWallInsertContext = createContext<PhotoWallInsertContextValue | null>(null);

function usePhotoWallInsertContext(): PhotoWallInsertContextValue {
  const ctx = useContext(PhotoWallInsertContext);
  if (!ctx) {
    throw new Error("PhotoWallInsertContext is missing");
  }
  return ctx;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

function kenBurnsLayerClass(kenBurnsMotion: boolean, photoIndex: number): string {
  if (!kenBurnsMotion) return "photo-wall-waterfall-tile__layer";
  const variant = photoWallKenBurnsVariant(photoIndex);
  return `photo-wall-waterfall-tile__layer photo-wall-waterfall-tile__layer--ken-burns-${variant}`;
}

function buildInitialColumnTiles(
  photos: readonly TilePhoto[],
  columnIndex: number,
  columnCount: number,
): ColumnTile[] {
  const columnPhotos = buildPhotoWallWaterfallColumnPhotos(photos, columnIndex, columnCount);
  return columnPhotos.map((photo, slot) => ({
    id: `c${columnIndex}-init-${slot}`,
    photoIndex: photos.findIndex((item) => item.key === photo.key),
  }));
}

function WaterfallTile({
  photo,
  tileId,
  tileKey,
  logicalIndex,
  kenBurnsMotion,
  isClipDriver,
  expandClipHeightPx,
  onExpandClipHeightChange,
  insertPhotos,
  onCenterZoneChange,
  onExpandComplete,
  onBroken,
}: {
  photo: TilePhoto;
  tileId: string;
  tileKey: string;
  logicalIndex: number;
  kenBurnsMotion: boolean;
  isClipDriver: boolean;
  expandClipHeightPx: number | null;
  onExpandClipHeightChange?: (height: number) => void;
  insertPhotos: boolean;
  onCenterZoneChange: (tileKey: string, info: Omit<CenterZoneTile, "tileKey"> | null) => void;
  onExpandComplete?: () => void;
  onBroken?: (tileId: string) => void;
}) {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [clipAnimating, setClipAnimating] = useState(false);
  const expandCompleteRef = useRef(false);
  const usesClip = expandClipHeightPx !== null;

  const measureClipHeight = useCallback(() => {
    const tile = tileRef.current;
    const img = imgRef.current;
    if (!tile || !img || img.naturalWidth <= 0) return 0;
    return (img.naturalHeight / img.naturalWidth) * tile.clientWidth;
  }, []);

  useEffect(() => {
    setLoaded(false);
    setBroken(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [photo.src]);

  useEffect(() => {
    expandCompleteRef.current = false;
    if (!isClipDriver) {
      setClipAnimating(false);
      return;
    }
    if (!loaded) {
      onExpandClipHeightChange?.(0);
      setClipAnimating(false);
      return;
    }

    const target = measureClipHeight();
    onExpandClipHeightChange?.(0);
    setClipAnimating(false);

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        setClipAnimating(true);
        onExpandClipHeightChange?.(target);
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [isClipDriver, loaded, measureClipHeight, onExpandClipHeightChange]);

  useEffect(() => {
    const node = tileRef.current;
    if (!node || !insertPhotos) return;

    const edgePercent = INSERT_VIEWPORT_EDGE_RATIO * 100;
    const rootMargin = `-${edgePercent}% 0px -${edgePercent}% 0px`;

    const reportCenterZone = (entry: IntersectionObserverEntry) => {
      if (!entry.isIntersecting || entry.intersectionRatio <= 0) {
        onCenterZoneChange(tileKey, null);
        return;
      }
      const rect = entry.boundingClientRect;
      const tileCenterY = rect.top + rect.height / 2;
      const viewportCenterY = window.innerHeight / 2;
      onCenterZoneChange(tileKey, {
        logicalIndex,
        centerDistance: Math.abs(tileCenterY - viewportCenterY),
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        reportCenterZone(entry);
      },
      { rootMargin, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      onCenterZoneChange(tileKey, null);
    };
  }, [insertPhotos, logicalIndex, onCenterZoneChange, tileKey]);

  const completeExpand = useCallback(() => {
    if (expandCompleteRef.current) return;
    expandCompleteRef.current = true;
    const img = imgRef.current;
    const exactHeight = img ? img.getBoundingClientRect().height : (expandClipHeightPx ?? 0);
    onExpandClipHeightChange?.(exactHeight);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onExpandComplete?.();
      });
    });
  }, [expandClipHeightPx, onExpandClipHeightChange, onExpandComplete]);

  useEffect(() => {
    if (!isClipDriver || !clipAnimating) return;
    const timer = window.setTimeout(completeExpand, PHOTO_WALL_INSERT_DURATION_MS + 400);
    return () => window.clearTimeout(timer);
  }, [clipAnimating, completeExpand, isClipDriver]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "height" || !isClipDriver || !clipAnimating) return;
    completeExpand();
  };

  if (broken) {
    return null;
  }

  const frameStyle = {
    "--photo-wall-insert-ms": `${PHOTO_WALL_INSERT_DURATION_MS}ms`,
    ...(usesClip
      ? {
          height: expandClipHeightPx,
          overflow: "hidden",
          transition:
            isClipDriver && clipAnimating
              ? `height var(--photo-wall-insert-ms) cubic-bezier(0.4, 0, 0.2, 1)`
              : "none",
        }
      : {}),
  } as CSSProperties;

  const handleImageError = () => {
    setBroken(true);
    onBroken?.(tileId);
  };

  return (
    <Box ref={tileRef} className="photo-wall-waterfall-tile">
      <Box
        className={[
          "photo-wall-waterfall-tile__frame",
          usesClip ? "photo-wall-waterfall-tile__frame--clip" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={frameStyle}
        onTransitionEnd={isClipDriver ? handleTransitionEnd : undefined}
      >
        <img
          ref={imgRef}
          className={[
            kenBurnsLayerClass(kenBurnsMotion, photo.index),
            loaded || usesClip ? "photo-wall-waterfall-tile__layer--loaded" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          src={photo.src}
          alt={photo.alt}
          loading="eager"
          decoding="async"
          fetchPriority={isClipDriver ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
        />
      </Box>
    </Box>
  );
}

function WaterfallColumn({
  photos,
  columnIndex,
  columnCount,
  scroll,
  kenBurnsMotion,
  insertPhotos,
}: {
  photos: TilePhoto[];
  columnIndex: number;
  columnCount: number;
  scroll: boolean;
  kenBurnsMotion: boolean;
  insertPhotos: boolean;
}) {
  const { registerColumn, notifyInsertStart, notifyInsertEnd } = usePhotoWallInsertContext();
  const insertCountRef = useRef(0);
  const insertIdRef = useRef(0);
  const centerZoneTilesRef = useRef<Map<string, CenterZoneTile>>(new Map());
  const insertingRef = useRef(false);
  const pickSlotRef = useRef(columnIndex);

  const [tiles, setTiles] = useState<ColumnTile[]>(() =>
    buildInitialColumnTiles(photos, columnIndex, columnCount),
  );
  const [expandingTileId, setExpandingTileId] = useState<string | null>(null);
  const [expandClipHeightPx, setExpandClipHeightPx] = useState<number | null>(null);

  const scrollDurationSec = photoWallWaterfallScrollDurationSec(columnIndex, columnCount);
  const strip = useMemo(() => [...tiles, ...tiles], [tiles]);
  const expandingSlotIndex = useMemo(() => {
    if (!expandingTileId) return -1;
    return strip.findIndex((tile) => tile.id === expandingTileId);
  }, [expandingTileId, strip]);

  const onCenterZoneChange = useCallback(
    (tileKey: string, info: Omit<CenterZoneTile, "tileKey"> | null) => {
      if (!info) {
        centerZoneTilesRef.current.delete(tileKey);
        return;
      }
      centerZoneTilesRef.current.set(tileKey, { tileKey, ...info });
    },
    [],
  );

  const pickCenterZoneInsertIndex = useCallback((): number | null => {
    const byLogicalIndex = new Map<number, number>();
    for (const tile of centerZoneTilesRef.current.values()) {
      const prev = byLogicalIndex.get(tile.logicalIndex);
      if (prev === undefined || tile.centerDistance < prev) {
        byLogicalIndex.set(tile.logicalIndex, tile.centerDistance);
      }
    }
    const centerZone = Array.from(byLogicalIndex.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([logicalIndex]) => logicalIndex);
    if (centerZone.length === 0) return null;

    pickSlotRef.current = pickSlotRef.current % centerZone.length;
    const afterIndex = centerZone[pickSlotRef.current]!;
    pickSlotRef.current = (pickSlotRef.current + 1) % centerZone.length;
    return afterIndex;
  }, []);

  const finishInsert = useCallback(() => {
    setExpandingTileId(null);
    setExpandClipHeightPx(null);
    insertingRef.current = false;
    notifyInsertEnd();
  }, [notifyInsertEnd]);

  const handleTileBroken = useCallback(
    (tileId: string) => {
      setTiles((prev) => prev.filter((tile) => tile.id !== tileId));
      if (expandingTileId === tileId) {
        finishInsert();
      }
    },
    [expandingTileId, finishInsert],
  );

  const tryInsertVisible = useCallback(() => {
    if (insertingRef.current || photos.length <= 1) return false;

    const afterIndex = pickCenterZoneInsertIndex();
    if (afterIndex === null) return false;

    const insertAt = afterIndex + 1;
    const forbiddenNeighbors = [tiles[afterIndex]?.photoIndex, tiles[insertAt]?.photoIndex].filter(
      (index): index is number => index !== undefined,
    );

    insertingRef.current = true;
    notifyInsertStart();

    const attemptInsert = (tryOffset: number) => {
      const nextPhotoIndex = photoWallPickInsertPhotoIndex(
        photos.length,
        columnIndex,
        columnCount,
        forbiddenNeighbors,
        insertCountRef.current + tryOffset,
      );
      if (nextPhotoIndex === null) {
        insertingRef.current = false;
        notifyInsertEnd();
        return;
      }

      const nextPhoto = photos[nextPhotoIndex];
      if (!nextPhoto) {
        attemptInsert(tryOffset + 1);
        return;
      }

      const newTileId = `c${columnIndex}-ins-${insertIdRef.current}`;
      insertIdRef.current += 1;
      let committed = false;

      const commitInsert = () => {
        if (committed) return;
        committed = true;
        insertCountRef.current += 1;
        setTiles((prev) => {
          const next = [...prev];
          next.splice(insertAt, 0, { id: newTileId, photoIndex: nextPhotoIndex });
          return next;
        });
        setExpandingTileId(newTileId);
        setExpandClipHeightPx(0);
      };

      const preload = new Image();
      preload.addEventListener("load", commitInsert, { once: true });
      preload.addEventListener("error", () => attemptInsert(tryOffset + 1), { once: true });
      preload.src = nextPhoto.src;
      if (preload.complete && preload.naturalWidth > 0) {
        commitInsert();
      }
    };

    attemptInsert(0);
    return true;
  }, [
    columnCount,
    columnIndex,
    notifyInsertEnd,
    notifyInsertStart,
    photos,
    tiles,
    pickCenterZoneInsertIndex,
  ]);

  useEffect(() => {
    registerColumn(columnIndex, {
      tryInsertVisible,
      isInserting: () => insertingRef.current,
    });
    return () => registerColumn(columnIndex, null);
  }, [columnIndex, registerColumn, tryInsertVisible]);

  const trackStyle = {
    "--photo-wall-scroll-duration": `${scrollDurationSec}s`,
  } as CSSProperties;

  return (
    <Box className="photo-wall-waterfall-column">
      <Box
        className={[
          "photo-wall-waterfall-column__track",
          scroll ? "photo-wall-waterfall-column__track--scroll" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={trackStyle}
      >
        {strip.map((tile, slotIndex) => {
          const photo = photos[tile.photoIndex];
          if (!photo) return null;
          const logicalIndex = slotIndex % tiles.length;
          const tileKey = `${columnIndex}-${slotIndex}-${tile.id}`;
          const isClipDriver = slotIndex === expandingSlotIndex;
          const tileExpandClipHeightPx = tile.id === expandingTileId ? expandClipHeightPx : null;
          return (
            <WaterfallTile
              key={tileKey}
              tileId={tile.id}
              tileKey={tileKey}
              photo={photo}
              logicalIndex={logicalIndex}
              kenBurnsMotion={kenBurnsMotion}
              isClipDriver={isClipDriver}
              expandClipHeightPx={tileExpandClipHeightPx}
              onExpandClipHeightChange={isClipDriver ? setExpandClipHeightPx : undefined}
              insertPhotos={insertPhotos}
              onCenterZoneChange={onCenterZoneChange}
              onBroken={slotIndex < tiles.length ? handleTileBroken : undefined}
              onExpandComplete={isClipDriver ? finishInsert : undefined}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function PhotoWallInsertProvider({
  insertPhotos,
  columnCount,
  children,
}: {
  insertPhotos: boolean;
  columnCount: number;
  children: ReactNode;
}) {
  const columnsRef = useRef<Map<number, ColumnInsertApi>>(new Map());
  const pickColumnRef = useRef(0);
  const insertBusyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const scheduleNextInsert = useCallback(
    (delayMs = PHOTO_WALL_INSERT_INTERVAL_MS) => {
      if (!insertPhotos) return;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (insertBusyRef.current) {
          scheduleNextInsert(PHOTO_WALL_INSERT_RETRY_MS);
          return;
        }

        let inserted = false;
        for (let step = 0; step < columnCount; step += 1) {
          const columnIndex = (pickColumnRef.current + step) % columnCount;
          const api = columnsRef.current.get(columnIndex);
          if (!api || api.isInserting()) continue;
          if (api.tryInsertVisible()) {
            pickColumnRef.current = (columnIndex + 1) % columnCount;
            inserted = true;
            break;
          }
        }

        if (!inserted) {
          scheduleNextInsert(PHOTO_WALL_INSERT_RETRY_MS);
        }
      }, delayMs);
    },
    [columnCount, insertPhotos],
  );

  const registerColumn = useCallback((columnIndex: number, api: ColumnInsertApi | null) => {
    if (api) {
      columnsRef.current.set(columnIndex, api);
      return;
    }
    columnsRef.current.delete(columnIndex);
  }, []);

  const notifyInsertStart = useCallback(() => {
    insertBusyRef.current = true;
  }, []);

  const notifyInsertEnd = useCallback(() => {
    insertBusyRef.current = false;
    scheduleNextInsert();
  }, [scheduleNextInsert]);

  useEffect(() => {
    if (!insertPhotos) {
      columnsRef.current.clear();
      insertBusyRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    scheduleNextInsert();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [insertPhotos, scheduleNextInsert]);

  const value = useMemo(
    () => ({
      insertPhotos,
      registerColumn,
      notifyInsertStart,
      notifyInsertEnd,
    }),
    [insertPhotos, notifyInsertEnd, notifyInsertStart, registerColumn],
  );

  return (
    <PhotoWallInsertContext.Provider value={value}>{children}</PhotoWallInsertContext.Provider>
  );
}

export function ProjectorPhotoWallSection({ view }: Props) {
  const viewportWidth = useViewportWidth();
  const photos = useMemo(
    () =>
      buildPhotoWallAlbumPhotos({
        baseUrl: view.photoWallBaseUrl,
        count: view.photoWallImageCount,
        ext: view.photoWallImageExt,
      }).map((photo) => ({ ...photo, alt: `Фото ${photo.index}` })),
    [view.photoWallBaseUrl, view.photoWallImageCount, view.photoWallImageExt],
  );

  const columnCount = resolvePhotoWallColumnCount(view.photoWallGridColumns, viewportWidth);
  const scroll = view.photoWallAnimate;
  const insertPhotos = view.photoWallKenBurns && photos.length > 1;
  const kenBurnsMotion = view.photoWallAnimate || view.photoWallKenBurns;

  if (photos.length === 0) {
    return (
      <Stack
        spacing={2}
        sx={{
          minHeight: "60dvh",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Typography
          variant="h5"
          align="center"
          sx={{ color: view.voteOptionTextColor, opacity: 0.85, fontFamily: view.brandFontFamily }}
        >
          Укажите папку с фото и их количество в админке
        </Typography>
      </Stack>
    );
  }

  return (
    <PhotoWallInsertProvider insertPhotos={insertPhotos} columnCount={columnCount}>
      <Box
        className="photo-wall-waterfall"
        sx={{ width: "100%", height: "100%", minHeight: "100dvh" }}
      >
        {Array.from({ length: columnCount }, (_, columnIndex) => (
          <WaterfallColumn
            key={columnIndex}
            photos={photos}
            columnIndex={columnIndex}
            columnCount={columnCount}
            scroll={scroll}
            kenBurnsMotion={kenBurnsMotion}
            insertPhotos={insertPhotos}
          />
        ))}
      </Box>
    </PhotoWallInsertProvider>
  );
}
