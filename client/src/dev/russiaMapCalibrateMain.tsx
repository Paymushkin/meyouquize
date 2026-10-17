import { createRoot } from "react-dom/client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import russiaSvgPathsJson from "../data/russia-svg-paths.json";
import {
  fitThinPlateSpline,
  formatTsNumber,
  projectWithTps,
  type ControlPoint,
} from "./russiaMapCalibrateTps";

/** Калибратор карты РФ — только `npm run dev` / Vite DEV. */
if (!import.meta.env.DEV) {
  document.body.innerHTML =
    '<p style="padding:24px;font:16px sans-serif">Калибровка карты доступна только при локальной разработке (<code>npm run dev</code>).</p>';
  throw new Error("russia-map-calibrate is local-dev only");
}

type CityPreset = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Seed SVG coords from current geometry (editable). */
  x: number;
  y: number;
};

type RussiaSvgMapData = {
  viewBox: string;
  paths: { id: string; d: string }[];
};

const mapData = russiaSvgPathsJson as RussiaSvgMapData;

/** Ключевые города: lat/lon из словаря geo-poll, стартовые x/y — текущая калибровка. */
const CITY_PRESETS: CityPreset[] = [
  { id: "msk", name: "Москва", lat: 55.75222, lon: 37.61556, x: 263.83, y: 420.29 },
  { id: "spb", name: "Санкт-Петербург", lat: 59.9343, lon: 30.3351, x: 232.13, y: 301.94 },
  { id: "ekb", name: "Екатеринбург", lat: 56.8519, lon: 60.6122, x: 548.04, y: 588.54 },
  { id: "don", name: "Донецк", lat: 48.023, lon: 37.80224, x: 112.58, y: 542.33 },
  { id: "sim", name: "Симферополь", lat: 44.9521, lon: 34.1024, x: 125.61, y: 724.18 },
  { id: "kgd", name: "Калининград", lat: 54.7104, lon: 20.4522, x: 29.07, y: 540.36 },
  { id: "nsk", name: "Новосибирск", lat: 55.0415, lon: 82.9346, x: 820, y: 520 },
  { id: "kja", name: "Красноярск", lat: 56.0184, lon: 92.8672, x: 980, y: 480 },
  { id: "yak", name: "Якутск", lat: 62.0339, lon: 129.733, x: 1400, y: 320 },
  { id: "vvo", name: "Владивосток", lat: 43.1155, lon: 131.8855, x: 1554.23, y: 840.94 },
  { id: "uys", name: "Южно-Сахалинск", lat: 46.9591, lon: 142.738, x: 1619.28, y: 909.56 },
  { id: "pkc", name: "Петропавловск-Камчатский", lat: 53.0446, lon: 158.65, x: 1741.21, y: 386.47 },
  { id: "ana", name: "Анадырь", lat: 64.7333, lon: 177.5167, x: 1674.62, y: 204.61 },
  { id: "mmk", name: "Мурманск", lat: 68.97917, lon: 33.09251, x: 250, y: 120 },
  { id: "arh", name: "Архангельск", lat: 64.5401, lon: 40.5433, x: 310, y: 200 },
  { id: "sochi", name: "Сочи", lat: 43.59917, lon: 39.72569, x: 150, y: 760 },
  { id: "rnd", name: "Ростов-на-Дону", lat: 47.23135, lon: 39.72328, x: 160, y: 580 },
  { id: "kzn", name: "Казань", lat: 55.78874, lon: 49.12214, x: 400, y: 450 },
  { id: "nnv", name: "Нижний Новгород", lat: 56.32867, lon: 44.00205, x: 340, y: 400 },
  { id: "sam", name: "Самара", lat: 53.20007, lon: 50.15, x: 420, y: 520 },
  { id: "oms", name: "Омск", lat: 54.99244, lon: 73.36859, x: 700, y: 520 },
  { id: "irk", name: "Иркутск", lat: 52.29778, lon: 104.29639, x: 1150, y: 560 },
  { id: "khv", name: "Хабаровск", lat: 48.48271, lon: 135.08379, x: 1580, y: 700 },
  { id: "chel", name: "Челябинск", lat: 55.15402, lon: 61.42915, x: 560, y: 500 },
  { id: "ufa", name: "Уфа", lat: 54.74306, lon: 55.96779, x: 490, y: 500 },
  { id: "perm", name: "Пермь", lat: 58.01046, lon: 56.25017, x: 500, y: 420 },
  { id: "vor", name: "Воронеж", lat: 51.67204, lon: 39.1843, x: 200, y: 520 },
  { id: "vgg", name: "Волгоград", lat: 48.71939, lon: 44.50183, x: 250, y: 580 },
  { id: "tjm", name: "Тюмень", lat: 57.15222, lon: 65.52722, x: 600, y: 460 },
  { id: "tom", name: "Томск", lat: 56.49771, lon: 84.97437, x: 860, y: 480 },
  { id: "hta", name: "Чита", lat: 52.03171, lon: 113.50087, x: 1280, y: 540 },
  { id: "uud", name: "Улан-Удэ", lat: 51.82721, lon: 107.60627, x: 1200, y: 560 },
  { id: "gdx", name: "Магадан", lat: 59.5638, lon: 150.80347, x: 1680, y: 300 },
  { id: "krr", name: "Краснодар", lat: 45.04484, lon: 38.97603, x: 160, y: 700 },
  { id: "ast", name: "Астрахань", lat: 46.34968, lon: 48.04076, x: 300, y: 640 },
  { id: "sar", name: "Саратов", lat: 51.54056, lon: 46.00861, x: 340, y: 540 },
  { id: "yar", name: "Ярославль", lat: 57.62987, lon: 39.87368, x: 280, y: 360 },
  { id: "psk", name: "Псков", lat: 57.8136, lon: 28.3496, x: 180, y: 340 },
  { id: "pes", name: "Петрозаводск", lat: 61.78491, lon: 34.34691, x: 250, y: 250 },
  { id: "nsr", name: "Норильск", lat: 69.3535, lon: 88.2027, x: 900, y: 80 },
  { id: "bqs", name: "Благовещенск", lat: 50.27961, lon: 127.5405, x: 1480, y: 620 },
  { id: "bax", name: "Барнаул", lat: 53.36056, lon: 83.76361, x: 840, y: 560 },
  { id: "ren", name: "Оренбург", lat: 51.7727, lon: 55.0988, x: 480, y: 560 },
];

const SEEDED_IDS = new Set(["msk", "spb", "ekb", "don", "sim", "kgd", "vvo", "uys", "pkc", "ana"]);

type PlacedCity = CityPreset & { placed: boolean };

function loadInitial(): PlacedCity[] {
  try {
    const raw = localStorage.getItem("russia-map-calibrate-v1");
    if (raw) {
      const parsed = JSON.parse(raw) as PlacedCity[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const byId = new Map(parsed.map((c) => [c.id, c]));
        return CITY_PRESETS.map((preset) => {
          const saved = byId.get(preset.id);
          if (saved) {
            return {
              ...preset,
              x: saved.x,
              y: saved.y,
              placed: saved.placed,
            };
          }
          return { ...preset, placed: SEEDED_IDS.has(preset.id) };
        });
      }
    }
  } catch {
    /* ignore */
  }
  return CITY_PRESETS.map((c) => ({ ...c, placed: SEEDED_IDS.has(c.id) }));
}

function buildGeometryTs(controls: ControlPoint[], wx: number[], wy: number[]): string {
  const controlLines = controls
    .map((c, i) => {
      const name =
        CITY_PRESETS.find((p) => p.lat === c.lat && p.lon === c.lon)?.name ?? `point${i}`;
      return `  { lat: ${c.lat}, lon: ${c.lon}, x: ${formatTsNumber(c.x)}, y: ${formatTsNumber(c.y)} }, // ${name}`;
    })
    .join("\n");

  const fmtArr = (arr: number[]) =>
    arr
      .map((n, i) => (i > 0 && i % 6 === 0 ? `\n  ${formatTsNumber(n)}` : formatTsNumber(n)))
      .join(", ");

  return `const RUSSIA_MAP_CONTROLS: ControlPoint[] = [
${controlLines}
];

const RUSSIA_MAP_TPS_WX = [
  ${fmtArr(wx)},
] as const;
const RUSSIA_MAP_TPS_WY = [
  ${fmtArr(wy)},
] as const;
`;
}

function RussiaMapCalibrateApp() {
  const [cities, setCities] = useState<PlacedCity[]>(loadInitial);
  const [selectedId, setSelectedId] = useState<string | null>(CITY_PRESETS[0]!.id);
  const [status, setStatus] = useState(
    "Выбери город слева и кликни на карте (или перетащи точку).",
  );
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null);
  const skipClickRef = useRef(false);
  const panRef = useRef<{ pointerId: number; x: number; y: number; tx: number; ty: number } | null>(
    null,
  );

  useEffect(() => {
    localStorage.setItem("russia-map-calibrate-v1", JSON.stringify(cities));
  }, [cities]);

  const placedControls: ControlPoint[] = useMemo(
    () => cities.filter((c) => c.placed).map(({ lat, lon, x, y }) => ({ lat, lon, x, y })),
    [cities],
  );

  const tps = useMemo(() => fitThinPlateSpline(placedControls), [placedControls]);

  const clientToSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
  };

  const placeAt = (id: string, x: number, y: number) => {
    setCities((prev) => prev.map((c) => (c.id === id ? { ...c, x, y, placed: true } : c)));
    setStatus(`«${cities.find((c) => c.id === id)?.name ?? id}» → (${x}, ${y})`);
  };

  const onMapClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    if (dragRef.current || panRef.current) return;
    if (!selectedId) {
      setStatus("Сначала выбери город в списке.");
      return;
    }
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    placeAt(selectedId, p.x, p.y);
  };

  const onMarkerPointerDown = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, pointerId: e.pointerId, moved: false };
    setSelectedId(id);
  };

  const onMarkerPointerMove = (e: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.moved = true;
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    placeAt(drag.id, p.x, p.y);
  };

  const onMarkerPointerUp = (e: ReactPointerEvent<SVGGElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      if (dragRef.current.moved) skipClickRef.current = true;
      dragRef.current = null;
    }
  };

  const onBgPointerDown = (e: ReactPointerEvent<SVGRectElement>) => {
    if (e.button === 1 || e.altKey || e.shiftKey) {
      e.preventDefault();
      panRef.current = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        tx: view.tx,
        ty: view.ty,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onBgPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    setView((v) => ({
      ...v,
      tx: pan.tx + (e.clientX - pan.x),
      ty: pan.ty + (e.clientY - pan.y),
    }));
  };

  const onBgPointerUp = (e: ReactPointerEvent<SVGRectElement>) => {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => {
      const next = Math.min(8, Math.max(0.4, v.scale * factor));
      return { ...v, scale: next };
    });
  };

  const clearCity = (id: string) => {
    setCities((prev) => prev.map((c) => (c.id === id ? { ...c, placed: false } : c)));
  };

  const resetDefaults = () => {
    setCities(CITY_PRESETS.map((c) => ({ ...c, placed: SEEDED_IDS.has(c.id) })));
    setStatus("Сброшено к стартовым координатам.");
  };

  const exportPayload = () => {
    if (!tps || placedControls.length < 3) {
      setStatus("Нужно минимум 3 размеченные точки.");
      return null;
    }
    return {
      controls: placedControls,
      wx: tps.wx,
      wy: tps.wy,
      cities: cities.filter((c) => c.placed),
    };
  };

  const copyTs = async () => {
    const payload = exportPayload();
    if (!payload) return;
    const text = buildGeometryTs(payload.controls, payload.wx, payload.wy);
    await navigator.clipboard.writeText(text);
    setStatus("TypeScript-фрагмент скопирован в буфер.");
  };

  const downloadJson = () => {
    const payload = exportPayload();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "russia-map-controls.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus(
      "JSON скачан. Применить: node client/scripts/apply-russia-map-controls.mjs ~/Downloads/russia-map-controls.json",
    );
  };

  const markerR = 7 / view.scale;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "100%",
        background: "#111",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #2a2a2a",
          padding: "16px 14px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Калибровка карты РФ</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, lineHeight: 1.4 }}>
            Выбери город → клик по карте. Перетаскивай точку. Zoom — колесо, pan — Shift+drag.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={copyTs} style={btnStyle}>
            Копировать TS
          </button>
          <button type="button" onClick={downloadJson} style={btnStyle}>
            JSON
          </button>
          <button type="button" onClick={resetDefaults} style={{ ...btnStyle, opacity: 0.75 }}>
            Сброс
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#9ad29a", minHeight: 36 }}>{status}</div>

        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Контрольных: {placedControls.length}
          {tps ? " · TPS ok" : " · TPS ждёт ≥3 точек"}
        </div>

        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {cities.map((city) => {
            const active = city.id === selectedId;
            return (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(city.id)}
                  style={{
                    ...btnStyle,
                    width: "100%",
                    textAlign: "left",
                    background: active ? "#2a4a2a" : "#1a1a1a",
                    borderColor: active ? "#6bcf6b" : "#333",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {city.placed ? "●" : "○"} {city.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    {city.lat.toFixed(4)}, {city.lon.toFixed(4)}
                    {city.placed ? ` → ${city.x}, ${city.y}` : " — не размечен"}
                  </span>
                </button>
                {city.placed ? (
                  <button
                    type="button"
                    onClick={() => clearCity(city.id)}
                    style={{
                      ...btnStyle,
                      marginTop: 4,
                      fontSize: 11,
                      padding: "4px 8px",
                      opacity: 0.6,
                    }}
                  >
                    Убрать точку
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </aside>

      <div
        onWheel={onWheel}
        style={{
          overflow: "hidden",
          position: "relative",
          cursor: selectedId ? "crosshair" : "default",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            ref={svgRef}
            viewBox={mapData.viewBox}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            onClick={onMapClick}
            style={{ display: "block", background: "#111" }}
          >
            <rect
              x="-100"
              y="-100"
              width="2200"
              height="1300"
              fill="#111"
              onPointerDown={onBgPointerDown}
              onPointerMove={onBgPointerMove}
              onPointerUp={onBgPointerUp}
            />
            {mapData.paths.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.15}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
            ))}

            {cities
              .filter((c) => c.placed)
              .map((city) => (
                <g
                  key={city.id}
                  transform={`translate(${city.x}, ${city.y})`}
                  onPointerDown={(e) => onMarkerPointerDown(e, city.id)}
                  onPointerMove={onMarkerPointerMove}
                  onPointerUp={onMarkerPointerUp}
                  style={{ cursor: "grab" }}
                >
                  <circle
                    r={markerR * 2.2}
                    fill={city.id === selectedId ? "rgba(120,220,120,0.25)" : "rgba(255,80,80,0.2)"}
                  />
                  <circle
                    r={markerR}
                    fill={city.id === selectedId ? "#7dff7d" : "#ff5a5a"}
                    stroke="#fff"
                    strokeWidth={1.2 / view.scale}
                  />
                  <text
                    x={markerR * 1.6}
                    y={markerR * 0.35}
                    fill="#fff"
                    fontSize={12 / view.scale}
                    fontFamily="inherit"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {city.name}
                  </text>
                </g>
              ))}

            {/* Ghost preview for unplaced cities via TPS */}
            {tps
              ? cities
                  .filter((c) => !c.placed)
                  .map((city) => {
                    const p = projectWithTps(city.lat, city.lon, placedControls, tps.wx, tps.wy);
                    return (
                      <g
                        key={`ghost-${city.id}`}
                        transform={`translate(${p.x}, ${p.y})`}
                        opacity={0.45}
                      >
                        <circle
                          r={markerR * 0.7}
                          fill="#88aaff"
                          stroke="#fff"
                          strokeWidth={1 / view.scale}
                        />
                        <text
                          x={markerR}
                          y={markerR * 0.3}
                          fill="#cfe0ff"
                          fontSize={11 / view.scale}
                          style={{ pointerEvents: "none" }}
                        >
                          {city.name}?
                        </text>
                      </g>
                    );
                  })
              : null}
          </svg>
        </div>
      </div>
    </div>
  );
}

const btnStyle: CSSProperties = {
  background: "#1f1f1f",
  color: "#f2f2f2",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "8px 10px",
  cursor: "pointer",
  font: "inherit",
};

createRoot(document.getElementById("root")!).render(<RussiaMapCalibrateApp />);
