"use client";

import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type EnforcementPoint = Coordinates & {
  id: string;
  type: "speed" | "technology" | "interval";
  city: string;
  title: string;
  detail: string;
  direction: string;
  speedLimit: number | null;
  source: string;
  distanceKm: number;
};

type EnforcementSource = {
  label: string;
  url: string;
  available: boolean;
  total: number;
};

type EnforcementResponse = {
  points: EnforcementPoint[];
  sources: EnforcementSource[];
  notice: string;
  generatedAt: string;
};

const DEFAULT_CENTER: Coordinates = { latitude: 25.036, longitude: 121.432 };

const TYPE_LABEL: Record<EnforcementPoint["type"], string> = {
  speed: "固定測速",
  technology: "科技執法",
  interval: "區間測速",
};

const TYPE_COLOR: Record<EnforcementPoint["type"], string> = {
  speed: "#ff6a62",
  technology: "#ffcb47",
  interval: "#a990ff",
};

function distanceKm(origin: Coordinates, target: Coordinates) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(target.latitude - origin.latitude);
  const longitudeDelta = radians(target.longitude - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(target.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number) {
  return distance < 1 ? `${Math.max(1, Math.round(distance * 1000))} 公尺` : `${distance.toFixed(1)} 公里`;
}

export function NavigationPanel() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const enforcementLayerRef = useRef<LayerGroup | null>(null);
  const destinationLayerRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pointsRef = useRef<EnforcementPoint[]>([]);
  const fetchOriginRef = useRef<Coordinates | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [status, setStatus] = useState("按下定位，查看附近固定執法設備");
  const [points, setPoints] = useState<EnforcementPoint[]>([]);
  const [sources, setSources] = useState<EnforcementSource[]>([]);
  const [dataNotice, setDataNotice] = useState("");
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationText, setDestinationText] = useState("");

  const loadPoints = useCallback(async (origin: Coordinates) => {
    fetchOriginRef.current = origin;
    try {
      const response = await fetch(
        `/api/enforcement?lat=${origin.latitude}&lng=${origin.longitude}&radius=35`,
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error("無法讀取執法設備資料");
      const data = (await response.json()) as EnforcementResponse;
      pointsRef.current = data.points ?? [];
      setPoints(data.points ?? []);
      setSources(data.sources ?? []);
      setDataNotice(data.notice ?? "");
    } catch {
      setStatus("執法設備資料暫時無法更新，請以現場標誌為準");
    }
  }, []);

  const announceNearbyPoint = useCallback(
    (origin: Coordinates) => {
      if (!alertsEnabled) return;
      const nearest = pointsRef.current
        .map((point) => ({ point, distance: distanceKm(origin, point) }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (!nearest || nearest.distance > 0.4 || nearest.point.id === lastAlertIdRef.current) return;
      lastAlertIdRef.current = nearest.point.id;
      const speedLimit = nearest.point.speedLimit ? `，速限 ${nearest.point.speedLimit}` : "";
      const message = `前方 ${TYPE_LABEL[nearest.point.type]}${speedLimit}，請依速限行駛`;
      setStatus(message);
      navigator.vibrate?.([120, 80, 120]);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "zh-TW";
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    },
    [alertsEnabled],
  );

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !mapElementRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet
        .map(mapElementRef.current, { zoomControl: false })
        .setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], 13);
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);
      enforcementLayerRef.current = leaflet.layerGroup().addTo(map);
      destinationLayerRef.current = leaflet.layerGroup().addTo(map);
      map.on("click", (event) => {
        const next = { latitude: event.latlng.lat, longitude: event.latlng.lng };
        setDestination(next);
        setDestinationText(`${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)}`);
      });
      mapRef.current = map;
      setMapReady(true);
      void loadPoints(DEFAULT_CENTER);
    });

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loadPoints]);

  useEffect(() => {
    pointsRef.current = points;
    const leaflet = leafletRef.current;
    const layer = enforcementLayerRef.current;
    if (!leaflet || !layer || !mapReady) return;
    layer.clearLayers();
    points.slice(0, 450).forEach((point) => {
      const color = TYPE_COLOR[point.type];
      const marker = leaflet.circleMarker([point.latitude, point.longitude], {
        radius: point.type === "speed" ? 6 : 7,
        color,
        fillColor: color,
        fillOpacity: 0.78,
        weight: 2,
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("p");
      const source = document.createElement("small");
      title.textContent = `${TYPE_LABEL[point.type]}${point.speedLimit ? ` · ${point.speedLimit}` : ""}`;
      detail.textContent = [point.title, point.direction, point.detail].filter(Boolean).join(" · ");
      source.textContent = point.source;
      popup.append(title, detail, source);
      marker.bindPopup(popup);
      marker.addTo(layer);
    });
  }, [mapReady, points]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!leaflet || !map || !position) return;
    if (!userMarkerRef.current) {
      userMarkerRef.current = leaflet
        .circleMarker([position.latitude, position.longitude], {
          radius: 9,
          color: "#ffffff",
          fillColor: "#39e079",
          fillOpacity: 1,
          weight: 3,
        })
        .bindTooltip("你的位置")
        .addTo(map);
    } else {
      userMarkerRef.current.setLatLng([position.latitude, position.longitude]);
    }
  }, [position]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = destinationLayerRef.current;
    if (!leaflet || !layer) return;
    layer.clearLayers();
    if (!destination) return;
    leaflet
      .circleMarker([destination.latitude, destination.longitude], {
        radius: 9,
        color: "#ffffff",
        fillColor: "#5aa8ff",
        fillOpacity: 1,
        weight: 3,
      })
      .bindTooltip("目的地")
      .addTo(layer);
  }, [destination]);

  const nearestPoint = useMemo(() => {
    if (!position || !points.length) return null;
    return points
      .map((point) => ({ ...point, liveDistance: distanceKm(position, point) }))
      .sort((a, b) => a.liveDistance - b.liveDistance)[0];
  }, [points, position]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus("這台裝置不支援定位");
      return;
    }
    if (watchIdRef.current !== null) return;
    setStatus("正在取得 GPS 定位…");
    const watchId = navigator.geolocation.watchPosition(
      (location) => {
        const next = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setPosition(next);
        setSpeedKmh(Math.max(0, (location.coords.speed ?? 0) * 3.6));
        setTracking(true);
        setStatus("定位中 · 提醒功能需保持畫面開啟");
        mapRef.current?.setView([next.latitude, next.longitude], Math.max(mapRef.current.getZoom(), 15));
        const previousOrigin = fetchOriginRef.current;
        if (!previousOrigin || distanceKm(previousOrigin, next) > 8) void loadPoints(next);
        announceNearbyPoint(next);
      },
      (error) => {
        setTracking(false);
        setStatus(
          error.code === error.PERMISSION_DENIED
            ? "請在瀏覽器設定中允許定位"
            : "暫時收不到 GPS 訊號",
        );
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    watchIdRef.current = watchId;
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setSpeedKmh(0);
    setStatus("已停止定位");
    window.speechSynthesis?.cancel();
  };

  const navigationDestination = destination
    ? `${destination.latitude},${destination.longitude}`
    : destinationText.trim();
  const googleMapsUrl = navigationDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navigationDestination)}&travelmode=driving`
    : "#";
  const appleMapsUrl = navigationDestination
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(navigationDestination)}&dirflg=d`
    : "#";

  return (
    <section className="navigation-panel" aria-labelledby="navigation-title">
      <div className="section-heading navigation-heading">
        <div>
          <span className="step-label">安全導航 BETA</span>
          <h2 id="navigation-title">定位、導航與執法提醒</h2>
        </div>
        <div className="navigation-live">
          <span className={tracking ? "is-live" : ""} />
          {tracking ? "GPS 定位中" : "尚未定位"}
        </div>
      </div>

      <div className="navigation-layout">
        <div className="map-wrap">
          <div className="navigation-map" ref={mapElementRef} aria-label="附近執法設備地圖" />
          <div className="map-legend" aria-label="地圖圖例">
            <span><i className="legend-speed" />固定測速</span>
            <span><i className="legend-technology" />科技執法</span>
            <span><i className="legend-interval" />區間測速</span>
          </div>
          <span className="map-tip">點地圖可設定目的地</span>
        </div>

        <div className="navigation-console">
          <div className="speed-display">
            <span>GPS 速度</span>
            <strong>{Math.round(speedKmh)}</strong>
            <small>km/h · 僅供參考</small>
          </div>

          <div className="nearest-alert">
            <span>最近的公開設備</span>
            {nearestPoint ? (
              <>
                <strong>{TYPE_LABEL[nearestPoint.type]} · {formatDistance(nearestPoint.liveDistance)}</strong>
                <small>{nearestPoint.title}{nearestPoint.speedLimit ? ` · 速限 ${nearestPoint.speedLimit}` : ""}</small>
              </>
            ) : (
              <strong>定位後顯示</strong>
            )}
          </div>

          <div className="tracking-actions">
            <button className="navigation-primary" type="button" onClick={tracking ? stopTracking : startTracking}>
              {tracking ? "停止定位" : "開始安全提醒"}
            </button>
            <label className="alert-toggle">
              <input
                checked={alertsEnabled}
                onChange={(event) => setAlertsEnabled(event.target.checked)}
                type="checkbox"
              />
              語音＋震動
            </label>
          </div>
          <p className="navigation-status" role="status">{status}</p>

          <label className="destination-field">
            <span>目的地地址，或直接點地圖</span>
            <input
              value={destinationText}
              onChange={(event) => {
                setDestinationText(event.target.value);
                setDestination(null);
              }}
              placeholder="例如：輔仁大學正門"
              type="search"
            />
          </label>
          <div className="map-launchers">
            <a
              aria-disabled={!navigationDestination}
              className={!navigationDestination ? "disabled" : ""}
              href={appleMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Apple 地圖導航
            </a>
            <a
              aria-disabled={!navigationDestination}
              className={!navigationDestination ? "disabled" : ""}
              href={googleMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Google 地圖導航
            </a>
          </div>
        </div>
      </div>

      <div className="navigation-safety-note">
        <strong>安全提醒</strong>
        <p>
          僅顯示政府已公開且附座標的固定設備，不包含流動執法，也可能延遲或缺漏。
          請以現場速限、號誌與標誌為準；手機請固定於車架，停妥後再操作。
        </p>
      </div>

      <details className="data-sources">
        <summary>資料涵蓋與來源</summary>
        <div>
          {sources.map((source) => (
            <a href={source.url} key={source.label} rel="noreferrer" target="_blank">
              <span className={source.available ? "available" : ""} />
              {source.label}（{source.available ? `${source.total} 筆` : "暫時無法更新"}）
            </a>
          ))}
        </div>
        {dataNotice ? <p>{dataNotice}</p> : null}
      </details>
    </section>
  );
}
